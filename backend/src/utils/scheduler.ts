import cron, { ScheduledTask } from 'node-cron';
import logger from './logger';

let scheduledTasks: ScheduledTask[] = [];

async function runMarkAbsentees(): Promise<void> {
  try {
    const { markAbsentees } = await import('../scripts/markAbsentees');
    await markAbsentees();
  } catch (error) {
    logger.error('markAbsentees scheduler error:', error);
  }
}

async function runPortalExpiryCheck(): Promise<void> {
  try {
    const { checkPortalExpiry } = await import('../scripts/checkPortalExpiry');
    await checkPortalExpiry();
  } catch (error) {
    logger.error('checkPortalExpiry scheduler error:', error);
  }
}

async function runTrialClassCheck(): Promise<void> {
  try {
    const { checkTrialClasses } = await import('../scripts/checkTrialClasses');
    await checkTrialClasses();
  } catch (error) {
    logger.error('checkTrialClasses scheduler error:', error);
  }
}

async function runNotificationRetry(): Promise<void> {
  try {
    const { retryFailedNotifications } = await import('./notificationProcessor');
    await retryFailedNotifications();
  } catch (error) {
    logger.error('Notification retry scheduler error:', error);
  }
}

export function initializeSchedulers(): void {
  // Auto-absent: "if they do not click Join Now by the end of the class,
  // a scheduled backend job automatically marks them Absent." Runs every
  // 5 minutes so the gap between a class ending and its attendance being
  // finalized stays small.
  scheduledTasks.push(cron.schedule('*/5 * * * *', runMarkAbsentees));

  // Enrollment safety sweep. Attendance applies session exhaustion
  // immediately; this daily task catches interrupted or legacy records.
  scheduledTasks.push(cron.schedule('0 9 * * *', runPortalExpiryCheck));

  // Trial reminders and stale pending trial expiry.
  scheduledTasks.push(cron.schedule('*/30 * * * *', runTrialClassCheck));

  // Retry failed notification deliveries
  scheduledTasks.push(cron.schedule('*/30 * * * *', runNotificationRetry));

  logger.info('Schedulers initialized: markAbsentees (5m), enrollmentExpiry (daily 9am), trialClassCheck (30m), notificationRetry (30m)');
}

export function stopSchedulers(): void {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks = [];
  logger.info('All schedulers stopped');
}
