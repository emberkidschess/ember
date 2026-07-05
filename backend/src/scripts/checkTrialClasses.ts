import mongoose from 'mongoose';
import Class, { ClassStatus } from '../models/Class';
import Lead, { LeadStatus } from '../models/Lead';
import { classWindow } from '../utils/dateTime';
import logger from '../utils/logger';
import emailService from '../services/emailService';

const TRIAL_REMINDER_LEAD_HOURS = 24;
const TRIAL_EXPIRY_DAYS = 14;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export const checkTrialClasses = async (): Promise<void> => {
  try {
    const now = new Date();
    const reminderWindowEnd = new Date(now.getTime() + TRIAL_REMINDER_LEAD_HOURS * 60 * 60 * 1000);

    const pendingTrials = await Class.find({
      classType: 'trial',
      status: ClassStatus.SCHEDULED,
      trialResult: 'pending',
    }).populate('leadId', 'studentName parentName email');

    for (const trial of pendingTrials) {
      const { startAt, endAt } = classWindow(trial);
      const expiresAt = trial.trialExpiresAt || addDays(endAt, TRIAL_EXPIRY_DAYS);

      if (expiresAt <= now) {
        trial.trialResult = 'expired';
        trial.trialAttendanceStatus = trial.trialJoinedAt ? 'attended' : 'no_show';
        trial.status = ClassStatus.MISSED;
        trial.trialExpiresAt = expiresAt;
        await trial.save();

        if (trial.leadId) {
          await Lead.updateOne(
            { _id: trial.leadId, status: LeadStatus.TRIAL_SCHEDULED },
            { $set: { status: LeadStatus.FOLLOW_UP } }
          );
        }
        continue;
      }

      if (!trial.trialReminderSentAt && startAt > now && startAt <= reminderWindowEnd) {
        const lead = trial.leadId as any;
        if (lead?.email) {
          await emailService.sendTemplatedEmail(lead.email, 'trial_reminder', {
            parentName: lead.parentName,
            studentName: lead.studentName,
            date: trial.date.toLocaleDateString(),
            startTime: trial.startTime,
            endTime: trial.endTime,
            meetingLink: trial.meetingLink,
            timezone: trial.timezone,
          });
        }
        trial.trialReminderSentAt = now;
        trial.trialExpiresAt = expiresAt;
        await trial.save();
      }
    }
  } catch (error) {
    logger.error('checkTrialClasses error:', error);
  }
};

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids')
    .then(() => checkTrialClasses())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default checkTrialClasses;
