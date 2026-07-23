import Attendance, { AttendanceStatus, AttendanceSource } from '../models/Attendance';
import Class, { ClassStatus } from '../models/Class';
import logger from '../utils/logger';
import { classWindow } from '../utils/dateTime';
import mongoose from 'mongoose';
import {
  finalizeClassBatchProgress,
  fireBatchTriggerNotifications,
} from '../controllers/attendanceController';
import { NotificationChannel, NotificationType } from '../models/Notification';
import { sendNotification } from '../utils/notificationProcessor';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
      // Date is stored at UTC midnight while classWindow resolves the local
      // timezone. Looking slightly ahead catches an evening class in a
      // positive-offset timezone whose stored date is still tomorrow in UTC.
      date: { $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
      classType: { $in: ['regular', 'extra'] },
      status: ClassStatus.SCHEDULED,
    })
      .populate('coach', 'name email')
      .populate('batch', 'name')
      .select('_id date startTime endTime timezone course coach batch startedAt')
      .lean() as any[];

    if (candidateClasses.length === 0) return;

    const endedClasses: any[] = [];
    for (const c of candidateClasses) {
      const { endAt } = classWindow(c);
      if (now > endAt) {
        endedClasses.push(c);
      }
    }

    if (endedClasses.length === 0) return;

    let markedAbsent = 0;
    let missedClasses = 0;
    const touchedBatchIds = new Set<string>();
    for (const classData of endedClasses) {
      const classId = classData._id;
      const session = await mongoose.startSession();
      let triggerInfo: Awaited<ReturnType<typeof finalizeClassBatchProgress>> = {};
      let classWasMissed = false;
      try {
        await session.withTransaction(async () => {
          const attendanceRows = await Attendance.find({ class: classId }).select('status').session(session).lean();
          const hasStudentPresence = attendanceRows.some((row) =>
            row.status === AttendanceStatus.PRESENT || row.status === AttendanceStatus.DISPUTED
          );
          classWasMissed = !classData.startedAt && !hasStudentPresence;
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
            classWasMissed
              ? { $set: { status: ClassStatus.MISSED, unstartedAt: now } }
              : { $set: { status: ClassStatus.COMPLETED }, $unset: { unstartedAt: 1 } },
            { session }
          );
          // A genuinely unstarted class must not consume a batch session or
          // advance course progress; it remains eligible for rescheduling.
          if (!classWasMissed) {
            triggerInfo = await finalizeClassBatchProgress(classId, session);
          }
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

      if (classWasMissed) {
        missedClasses += 1;
        if (classData.coach?._id) {
          const coachName = escapeHtml(classData.coach.name || 'Coach');
          const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: classData.timezone }).format(classWindow(classData).startAt);
          const missedSubject = `Class marked missed: ${classData.course}`;
          const missedBody = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#222;line-height:1.6"><h2 style="color:#a13c22">Class marked missed</h2><p>Hi ${coachName},</p><p><strong>${escapeHtml(classData.course)}</strong> (${escapeHtml(classData.batch?.name || 'Individual class')}) on <strong>${escapeHtml(date)}</strong> was marked missed because no coach start and no student attendance were recorded before the class ended.</p><p>Please contact the academy team if the class took place or needs to be rescheduled.</p><p style="color:#6b7280;font-size:12px">EmberKids Chess Academy</p></div>`;
          await sendNotification({
            recipient: classData.coach._id.toString(),
            recipientType: 'Staff',
            type: NotificationType.CLASS_MISSED,
            channel: NotificationChannel.EMAIL,
            content: {
              subject: missedSubject,
              body: missedBody,
            },
          });

          // Keep the academy team informed as well; the portal status remains
          // the source of truth, while this email makes the missed session
          // actionable without waiting for someone to check reports.
          const teamRecipients = [
            process.env.SUPPORT_EMAIL,
            ...(process.env.ADMIN_EMAIL || '').split(','),
          ].map((email) => email?.trim() || '').filter(Boolean);
          if (teamRecipients.length) {
            try {
              const emailService = (await import('../services/emailService')).default;
              await emailService.sendRawEmail(teamRecipients.join(','), missedSubject, missedBody);
            } catch (teamError) {
              logger.error(`Failed to send missed-class team alert for ${classId}:`, teamError);
            }
          }
        }
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
      `markAbsentees: finalized ${endedClasses.length} class(es), marked ${markedAbsent} attendance record(s) absent, marked ${missedClasses} class(es) missed`
    );
  } catch (error) {
    logger.error('markAbsentees cron error:', error);
  }
};

export default markAbsentees;
