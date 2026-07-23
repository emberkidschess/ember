import mongoose from 'mongoose';
import Class, { ClassStatus } from '../models/Class';
import Staff from '../models/Staff';
import { NotificationChannel, NotificationType } from '../models/Notification';
import { classWindow } from '../utils/dateTime';
import { sendNotification } from '../utils/notificationProcessor';
import logger from '../utils/logger';

const SCHEDULE_DIGEST_HOUR = 8;
const CLAIM_TIMEOUT_MINUTES = 10;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function localParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function formatDate(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: timezone }).format(instant);
}

function buildScheduleBody(coachName: string, date: string, timezone: string, rows: any[]): string {
  const rowsHtml = rows.map((row) => `
    <li style="margin:0 0 12px;padding:12px 14px;background:#f8f9fa;border-radius:8px;list-style:none">
      <strong>${escapeHtml(row.startTime)}–${escapeHtml(row.endTime)}</strong> · ${escapeHtml(row.course)}
      <br><span style="color:#6b7280">${escapeHtml(row.batchName || 'Individual class')} · ${escapeHtml(row.classType === 'extra' ? 'Cover-up class' : 'Regular class')}</span>
      ${row.meetingLink ? `<br><a href="${escapeHtml(row.meetingLink)}" style="color:#e04a15">Open meeting link</a>` : ''}
    </li>
  `).join('');
  return `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#222;line-height:1.6">
      <h2 style="color:#1a1a2e">Your class schedule for today</h2>
      <p>Hi ${escapeHtml(coachName)},</p>
      <p>Here is your complete EmberKids teaching schedule for <strong>${escapeHtml(date)}</strong> (${escapeHtml(timezone)}).</p>
      <ul style="padding:0;margin:20px 0">${rowsHtml}</ul>
      <p style="color:#6b7280;font-size:13px">Please open each class from the staff portal using <strong>Start Now</strong>. This records the session start and helps the academy keep attendance and class reports accurate.</p>
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

/** Sends one local-day digest per coach and timezone. */
export async function sendCoachDailySchedules(now = new Date()): Promise<void> {
  const emailService = (await import('../services/emailService')).default;
  if (!emailService.isConfigured()) {
    logger.warn('Coach schedule digest skipped because email service is not configured');
    return;
  }

  const { from, to } = candidateDateRange(now);
  const classes = await Class.find({
    status: ClassStatus.SCHEDULED,
    classType: { $in: ['regular', 'extra'] },
    date: { $gte: from, $lt: to },
  })
    .populate('coach', 'name email')
    .populate('batch', 'name')
    .lean() as any[];

  const groups = new Map<string, { coach: any; timezone: string; dateKey: string; firstStartAt: Date; classes: any[] }>();
  for (const classData of classes) {
    if (!classData.coach?._id || !classData.coach.email) continue;
    try {
      const { startAt } = classWindow(classData);
      const { dateKey } = localParts(startAt, classData.timezone);
      const key = `${classData.coach._id.toString()}|${dateKey}|${classData.timezone}`;
      const current: { coach: any; timezone: string; dateKey: string; firstStartAt: Date; classes: any[] } = groups.get(key) || {
        coach: classData.coach,
        timezone: classData.timezone,
        dateKey,
        firstStartAt: startAt,
        classes: [] as any[],
      };
      current.firstStartAt = current.firstStartAt < startAt ? current.firstStartAt : startAt;
      current.classes.push({
        ...classData,
        batchName: classData.batch?.name,
        startAt,
      });
      groups.set(key, current);
    } catch (error) {
      logger.warn(`Skipping schedule digest class ${classData._id}: invalid timezone or time`, error);
    }
  }

  const staleClaimAt = new Date(now.getTime() - CLAIM_TIMEOUT_MINUTES * 60 * 1000);
  for (const [key, group] of groups) {
    const currentLocal = localParts(now, group.timezone);
    if (currentLocal.dateKey !== group.dateKey) continue;
    const firstClassLeadMinutes = (group.firstStartAt.getTime() - now.getTime()) / 60_000;
    const normalWindow = currentLocal.hour === SCHEDULE_DIGEST_HOUR && currentLocal.minute < 10;
    const earlyClassWindow = firstClassLeadMinutes >= 50 && firstClassLeadMinutes <= 70;
    if (!normalWindow && !earlyClassWindow) continue;

    const claim = await Staff.findOneAndUpdate(
      {
        _id: group.coach._id,
        $or: [
          { dailyScheduleLastSentKey: { $exists: false } },
          { dailyScheduleLastSentKey: { $ne: key } },
          // A crashed process should not permanently suppress tomorrow's
          // digest while a stale claim is being inspected.
          { updatedAt: { $lt: staleClaimAt }, dailyScheduleLastSentKey: key },
        ],
      },
      { $set: { dailyScheduleLastSentKey: key } },
      { new: true },
    ).lean();
    if (!claim) continue;

    group.classes.sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
    const body = buildScheduleBody(
      group.coach.name || 'Coach',
      formatDate(group.firstStartAt, group.timezone),
      group.timezone,
      group.classes,
    );
    const notification = await sendNotification({
      recipient: group.coach._id.toString(),
      recipientType: 'Staff',
      type: NotificationType.STAFF_DAILY_SCHEDULE,
      channel: NotificationChannel.EMAIL,
      content: {
        subject: `Your EmberKids class schedule for ${formatDate(group.firstStartAt, group.timezone)}`,
        body,
      },
    });
    if (!notification) {
      await Staff.updateOne({ _id: group.coach._id, dailyScheduleLastSentKey: key }, { $unset: { dailyScheduleLastSentKey: 1 } });
      continue;
    }
    logger.info(`Queued daily class schedule for coach ${group.coach._id} (${group.dateKey})`);
  }
}

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids')
    .then(() => sendCoachDailySchedules())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
}

export default sendCoachDailySchedules;
