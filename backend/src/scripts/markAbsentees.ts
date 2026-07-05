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

    // Find classes that have ended (today or earlier) and are still
    // scheduled/completed but might have unmarked attendance. We look back
    // up to 2 days to catch anything a prior run might have missed (e.g.
    // if the server was briefly down), without scanning the whole history
    // every run.
    const lookbackStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const candidateClasses = await Class.find({
      date: { $gte: lookbackStart, $lte: now },
      classType: 'regular',
      status: { $ne: 'cancelled' },
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
        await fireBatchTriggerNotifications(
          triggerInfo.batchId,
          !!triggerInfo.batchJustCompleted
        );
      }
    }

    logger.info(
      `markAbsentees: finalized ${endedClassIds.length} class(es), marked ${markedAbsent} attendance record(s) absent`
    );
  } catch (error) {
    logger.error('markAbsentees cron error:', error);
  }
};

export default markAbsentees;
