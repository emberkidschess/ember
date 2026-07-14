import Attendance, { AttendanceStatus, AttendanceSource } from '../models/Attendance';
import Class, { ClassStatus } from '../models/Class';
import logger from '../utils/logger';
import { classWindow } from '../utils/dateTime';
import mongoose from 'mongoose';
import {
  finalizeClassBatchProgress,
  fireBatchTriggerNotifications,
} from '../controllers/attendanceController';

/**
 * Auto-absent cron: "If they do not click it by the end of the class, a
 * scheduled backend job automatically marks them as Absent." Runs
 * frequently (every few minutes - see scheduler.ts) and sweeps up any
 * NOT_MARKED attendance record whose class has already ended.
 *
 * No package reversal needed here since NOT_MARKED never consumed a
 * credit in the first place - this is a pure status transition.
 */
export const markAbsentees = async (): Promise<void> => {
  try {
    const now = new Date();

    // No look-back cutoff: after an outage, the next run catches every
    // scheduled class that should already have closed.
    const candidateClasses = await Class.find({
      date: { $lte: now },
      classType: { $in: ['regular', 'extra'] },
      status: ClassStatus.SCHEDULED,
    }).select('_id date startTime endTime timezone').lean();

    if (candidateClasses.length === 0) return;

    const endedClassIds: any[] = [];
    for (const c of candidateClasses) {
      const { endAt } = classWindow(c);
      if (now > endAt) {
        endedClassIds.push(c._id);
      }
    }

    if (endedClassIds.length === 0) return;

    let markedAbsent = 0;
    const touchedBatchIds = new Set<string>();
    for (const classId of endedClassIds) {
      const session = await mongoose.startSession();
      let triggerInfo: Awaited<ReturnType<typeof finalizeClassBatchProgress>> = {};
      try {
        await session.withTransaction(async () => {
          const result = await Attendance.updateMany(
            { class: classId, status: AttendanceStatus.NOT_MARKED },
            {
              $set: {
                status: AttendanceStatus.ABSENT,
                source: AttendanceSource.AUTO_ABSENT_CRON,
                markedAt: now,
              },
            },
            { session }
          );
          markedAbsent += result.modifiedCount;
          await Class.findByIdAndUpdate(
            classId,
            { $set: { status: ClassStatus.COMPLETED } },
            { session }
          );
          triggerInfo = await finalizeClassBatchProgress(classId, session);
        });
      } finally {
        await session.endSession();
      }

      if (triggerInfo.batchId) {
        touchedBatchIds.add(triggerInfo.batchId);
        await fireBatchTriggerNotifications(
          triggerInfo.batchId,
          !!triggerInfo.batchJustCompleted
        );
      }
    }

    if (touchedBatchIds.size > 0) {
      const { CacheService, CacheNamespaces } = await import('../utils/cache');
      await CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`);
      await Promise.all(
        [...touchedBatchIds].map((batchId) =>
          CacheService.delete(`${CacheNamespaces.BATCH_DETAILS}:${batchId}`)
        )
      );
    }

    logger.info(
      `markAbsentees: finalized ${endedClassIds.length} class(es), marked ${markedAbsent} attendance record(s) absent`
    );
  } catch (error) {
    logger.error('markAbsentees cron error:', error);
  }
};

export default markAbsentees;
