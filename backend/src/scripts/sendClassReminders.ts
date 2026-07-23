import mongoose from 'mongoose';
import Class, { ClassStatus } from '../models/Class';
import { NotificationChannel, NotificationType } from '../models/Notification';
import { classWindow } from '../utils/dateTime';
import { sendNotification } from '../utils/notificationProcessor';
import logger from '../utils/logger';

const REMINDER_LEAD_MINUTES = 60;
const REMINDER_WINDOW_MINUTES = 10;
const CLAIM_TIMEOUT_MINUTES = 10;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatClassDate(startAt: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeZone: timezone,
  }).format(startAt);
}

function buildReminderBody(data: {
  parentName: string;
  studentName: string;
  course: string;
  batchName?: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  coachName?: string;
  meetingLink?: string;
}): string {
  const link = data.meetingLink
    ? `<p><strong>Meeting link:</strong> <a href="${escapeHtml(data.meetingLink)}">Join class</a></p>`
    : '';
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;line-height:1.6">
      <h2 style="color:#1a1a2e">Your class starts in 1 hour</h2>
      <p>Dear ${escapeHtml(data.parentName)},</p>
      <p>This is a friendly reminder that <strong>${escapeHtml(data.studentName)}</strong> has a chess class coming up soon.</p>
      <div style="background:#f8f9fa;padding:18px;border-radius:10px">
        <p><strong>Course:</strong> ${escapeHtml(data.course)}</p>
        ${data.batchName ? `<p><strong>Batch:</strong> ${escapeHtml(data.batchName)}</p>` : ''}
        <p><strong>Date:</strong> ${escapeHtml(data.date)}</p>
        <p><strong>Time:</strong> ${escapeHtml(data.startTime)} – ${escapeHtml(data.endTime)} (${escapeHtml(data.timezone)})</p>
        ${data.coachName ? `<p><strong>Coach:</strong> ${escapeHtml(data.coachName)}</p>` : ''}
        ${link}
      </div>
      <p>Please be ready a few minutes early so ${escapeHtml(data.studentName)} can join on time.</p>
      <p style="color:#6b7280;font-size:12px">EmberKids Chess Academy</p>
    </div>
  `;
}

function candidateDateRange(now: Date): { from: Date; to: Date } {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 3));
  return { from, to };
}

/**
 * Queue one-hour reminders for all scheduled, student-facing classes.
 *
 * The job deliberately uses the class timezone when calculating startAt;
 * fixed batch sessions are stored as date-only + local startTime, so a UTC
 * comparison would send reminders at the wrong hour for many countries.
 */
export async function sendUpcomingClassReminders(now = new Date()): Promise<void> {
  const emailService = (await import('../services/emailService')).default;
  if (!emailService.isConfigured()) {
    logger.warn('Class reminder sweep skipped because email service is not configured');
    return;
  }

  const { from, to } = candidateDateRange(now);
  const staleClaimAt = new Date(now.getTime() - CLAIM_TIMEOUT_MINUTES * 60 * 1000);
  const reminderStart = now.getTime() + (REMINDER_LEAD_MINUTES - REMINDER_WINDOW_MINUTES) * 60 * 1000;
  const reminderEnd = now.getTime() + (REMINDER_LEAD_MINUTES + REMINDER_WINDOW_MINUTES) * 60 * 1000;

  const classes = await Class.find({
    status: ClassStatus.SCHEDULED,
    classType: { $nin: ['trial', 'demo'] },
    date: { $gte: from, $lt: to },
    'students.0': { $exists: true },
    $and: [
      { $or: [{ classReminderQueuedAt: { $exists: false } }, { classReminderQueuedAt: null }] },
      {
        $or: [
          { classReminderProcessingAt: { $exists: false } },
          { classReminderProcessingAt: null },
          { classReminderProcessingAt: { $lt: staleClaimAt } },
        ],
      },
    ],
  })
    .populate('students', 'studentName parentName email')
    .populate('batch', 'name')
    .populate('coach', 'name')
    .lean() as any[];

  for (const candidate of classes) {
    let window: { startAt: Date; endAt: Date };
    try {
      window = classWindow(candidate);
    } catch (error) {
      logger.warn(`Skipping class ${candidate._id}: invalid timezone or time`, error);
      continue;
    }
    if (window.startAt.getTime() < reminderStart || window.startAt.getTime() > reminderEnd) continue;

    const claimed = await Class.findOneAndUpdate(
      {
        _id: candidate._id,
        status: ClassStatus.SCHEDULED,
        $or: [{ classReminderQueuedAt: { $exists: false } }, { classReminderQueuedAt: null }],
        $and: [
          {
            $or: [
              { classReminderProcessingAt: { $exists: false } },
              { classReminderProcessingAt: null },
              { classReminderProcessingAt: { $lt: staleClaimAt } },
            ],
          },
        ],
      },
      { $set: { classReminderProcessingAt: now } },
      { new: true },
    ).lean() as any;
    if (!claimed) continue;

    const students = Array.isArray(candidate.students) ? candidate.students : [];
    const date = formatClassDate(window.startAt, candidate.timezone);
    const batchName = candidate.batch?.name;
    const coachName = candidate.coach?.name;
    let queueFailed = false;

    for (const student of students) {
      if (!student?._id || !student.email) continue;
      const body = buildReminderBody({
        parentName: student.parentName || 'Parent',
        studentName: student.studentName || 'Student',
        course: candidate.course,
        batchName,
        date,
        startTime: candidate.startTime,
        endTime: candidate.endTime,
        timezone: candidate.timezone,
        coachName,
        meetingLink: candidate.meetingLink,
      });
      const notification = await sendNotification({
        recipient: student._id.toString(),
        recipientType: 'Student',
        type: NotificationType.CLASS_REMINDER,
        channel: NotificationChannel.EMAIL,
        content: {
          subject: `Reminder: Class in 1 hour - ${date}`,
          body,
        },
      });
      if (!notification) queueFailed = true;
    }

    if (queueFailed) {
      await Class.updateOne(
        { _id: candidate._id },
        { $unset: { classReminderProcessingAt: 1 } },
      );
      continue;
    }

    await Class.updateOne(
      { _id: candidate._id },
      { $set: { classReminderQueuedAt: now }, $unset: { classReminderProcessingAt: 1 } },
    );
    logger.info(`Queued one-hour class reminders for class ${candidate._id}`);
  }
}

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids')
    .then(() => sendUpcomingClassReminders())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
}

export default sendUpcomingClassReminders;
