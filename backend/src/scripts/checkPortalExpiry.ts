import mongoose from 'mongoose';
import Package, { PackageStatus } from '../models/Package';
import { NotificationType, NotificationChannel } from '../models/Notification';
import { sendNotification } from '../utils/notificationProcessor';
import logger from '../utils/logger';
import { ClientAuthService } from '../services/clientAuthService';
import {
  claimRenewalReminder,
  handleExhaustedPackage,
} from '../services/enrollmentLifecycleService';
import { RENEWAL_REMINDER_THRESHOLD } from '../domain/courseEnrollment';

/**
 * Safety sweep for enrollment state. The attendance transaction performs
 * these transitions immediately; this daily task catches legacy records or a
 * deployment interruption without relying on batch completion dates.
 */
export const checkPortalExpiry = async (): Promise<void> => {
  try {
    const nearCompletion = await Package.find({
      status: PackageStatus.ACTIVE,
      remainingClasses: { $gt: 0, $lte: RENEWAL_REMINDER_THRESHOLD },
      renewalReminderSentAt: { $exists: false },
    }).select('_id student remainingClasses');

    for (const packageItem of nearCompletion) {
      const session = await mongoose.startSession();
      let claimed = false;
      try {
        await session.withTransaction(async () => {
          claimed = await claimRenewalReminder(packageItem._id, session);
        });
      } finally {
        await session.endSession();
      }
      if (claimed) {
        const notification = await sendNotification(
          packageItem.student.toString(),
          NotificationType.PACKAGE_NEAR_COMPLETION,
          NotificationChannel.EMAIL,
          {
            subject: `${packageItem.remainingClasses} session(s) remaining - renew to continue`,
            body: `Your active session plan has ${packageItem.remainingClasses} session(s) left. Renew now to continue without interruption.`,
            data: { remainingClasses: packageItem.remainingClasses },
          }
        );
        if (!notification) {
          await Package.updateOne(
            { _id: packageItem._id, renewalReminderSentAt: { $exists: true } },
            { $unset: { renewalReminderSentAt: '' } }
          );
        }
      }
    }

    const exhaustedPackages = await Package.find({
      status: PackageStatus.ACTIVE,
      remainingClasses: { $lte: 0 },
    }).select('_id student');

    for (const packageItem of exhaustedPackages) {
      const session = await mongoose.startSession();
      let transition: Awaited<ReturnType<typeof handleExhaustedPackage>> = {
        queuedPackageActivated: false,
        studentExpired: false,
      };
      try {
        await session.withTransaction(async () => {
          transition = await handleExhaustedPackage(packageItem._id, session);
        });
      } finally {
        await session.endSession();
      }

      if (transition.authIdToRevoke) {
        await ClientAuthService.revokeAllTokens(transition.authIdToRevoke);
      }
      if (transition.studentExpired) {
        await sendNotification(
          packageItem.student.toString(),
          NotificationType.PACKAGE_COMPLETION,
          NotificationChannel.EMAIL,
          {
            subject: 'Session plan completed - renewal required',
            body: 'All purchased sessions are complete. Renew your enrollment to restore dashboard and course access.',
          }
        );
      }
    }
  } catch (error) {
    logger.error('checkPortalExpiry error:', error);
  }
};

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids')
    .then(() => checkPortalExpiry())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default checkPortalExpiry;
