import mongoose from 'mongoose';
import Class, { ClassStatus } from '../models/Class';
import { NotificationChannel, NotificationType } from '../models/Notification';
import { classWindow } from '../utils/dateTime';
import { sendNotification } from '../utils/notificationProcessor';
import logger from '../utils/logger';

const START_GRACE_MINUTES = 10;
const CLAIM_TIMEOUT_MINUTES = 10;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function localDateTime(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(instant);
}

function bodyFor(classData: any, startAt: Date): string {
  const coachName = classData.coach?.name || 'Coach';
  const batchName = classData.batch?.name || 'Individual class';
  return `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#222;line-height:1.6">
      <h2 style="color:#a13c22">Class start not recorded</h2>
      <p>Hi ${escapeHtml(coachName)},</p>
      <p>The following class has been open for more than ${START_GRACE_MINUTES} minutes, but no coach start has been recorded yet:</p>
      <div style="background:#fff4ef;padding:18px;border-radius:10px;border:1px solid #f2c7b8">
        <p><strong>Class:</strong> ${escapeHtml(classData.course)}</p>
        <p><strong>Batch:</strong> ${escapeHtml(batchName)}</p>
        <p><strong>Scheduled:</strong> ${escapeHtml(localDateTime(startAt, classData.timezone))} (${escapeHtml(classData.timezone)})</p>
      </div>
      <p>If the class is happening, open it from the staff portal using <strong>Start Now</strong>. If it was cancelled or could not be conducted, please inform the academy team so the session can be rescheduled.</p>
      <p style="color:#6b7280;font-size:13px">At the end of the scheduled slot, the system will mark the class as missed only when no coach start and no student attendance are recorded.</p>
      <p style="color:#6b7280;font-size:12px">EmberKids Chess Academy</p>
    </div>
  `;
}

function candidateDateRange(now: Date) {
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)),
    to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 3)),
  };
}

/** Alerts the assigned coach once when a live class has not been started. */
export async function checkUnstartedClasses(now = new Date()): Promise<void> {
  const emailService = (await import('../services/emailService')).default;
  if (!emailService.isConfigured()) {
    logger.warn('Unstarted-class alerts skipped because email service is not configured');
    return;
  }

  const { from, to } = candidateDateRange(now);
  const staleClaimAt = new Date(now.getTime() - CLAIM_TIMEOUT_MINUTES * 60 * 1000);
  const candidates = await Class.find({
    status: ClassStatus.SCHEDULED,
    classType: { $in: ['regular', 'extra'] },
    date: { $gte: from, $lt: to },
    startedAt: { $exists: false },
    $and: [
      { $or: [{ unstartedAlertQueuedAt: { $exists: false } }, { unstartedAlertQueuedAt: null }] },
      {
        $or: [
          { unstartedAlertProcessingAt: { $exists: false } },
          { unstartedAlertProcessingAt: null },
          { unstartedAlertProcessingAt: { $lt: staleClaimAt } },
        ],
      },
    ],
  })
    .populate('coach', 'name email')
    .populate('batch', 'name')
    .lean() as any[];

  for (const candidate of candidates) {
    let startAt: Date;
    let endAt: Date;
    try {
      ({ startAt, endAt } = classWindow(candidate));
    } catch (error) {
      logger.warn(`Skipping unstarted-class check ${candidate._id}: invalid timezone or time`, error);
      continue;
    }
    if (startAt.getTime() + START_GRACE_MINUTES * 60_000 > now.getTime() || endAt <= now) continue;
    if (!candidate.coach?._id || !candidate.coach.email) continue;

    const claimed = await Class.findOneAndUpdate(
      {
        _id: candidate._id,
        status: ClassStatus.SCHEDULED,
        startedAt: { $exists: false },
        $or: [{ unstartedAlertQueuedAt: { $exists: false } }, { unstartedAlertQueuedAt: null }],
        $and: [{
          $or: [
            { unstartedAlertProcessingAt: { $exists: false } },
            { unstartedAlertProcessingAt: null },
            { unstartedAlertProcessingAt: { $lt: staleClaimAt } },
          ],
        }],
      },
      { $set: { unstartedAlertProcessingAt: now } },
      { new: true },
    ).lean();
    if (!claimed) continue;

    const notification = await sendNotification({
      recipient: candidate.coach._id.toString(),
      recipientType: 'Staff',
      type: NotificationType.CLASS_NOT_STARTED,
      channel: NotificationChannel.EMAIL,
      content: {
        subject: `Action needed: ${candidate.course} has not been started`,
        body: bodyFor(candidate, startAt),
      },
    });
    if (!notification) {
      await Class.updateOne({ _id: candidate._id }, { $unset: { unstartedAlertProcessingAt: 1 } });
      continue;
    }
    await Class.updateOne(
      { _id: candidate._id },
      { $set: { unstartedAlertQueuedAt: now }, $unset: { unstartedAlertProcessingAt: 1 } },
    );
    logger.warn(`Queued unstarted-class alert for class ${candidate._id}`);
  }
}

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids')
    .then(() => checkUnstartedClasses())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
}

export default checkUnstartedClasses;
