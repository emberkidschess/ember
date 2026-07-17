import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student';
import ClientAuth from '../models/ClientAuth';
import Package from '../models/Package';
import Payment from '../models/Payment';
import PaymentLink from '../models/PaymentLink';
import Attendance from '../models/Attendance';
import EvaluationReport from '../models/EvaluationReport';
import Class from '../models/Class';
import Batch from '../models/Batch';
import Staff from '../models/Staff';
import Lead, { LeadStatus } from '../models/Lead';
import Notification from '../models/Notification';
import DeliveryLog from '../models/DeliveryLog';
import RefreshToken from '../models/RefreshToken';
import { initializeRedis, closeRedis } from '../config/redis';
import { CacheNamespaces, CacheService } from '../utils/cache';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emberkids';
const APPLY_CHANGES = process.argv.includes('--apply');

type CleanupSummary = Record<string, number>;

const toObjectIds = (ids: string[]): Types.ObjectId[] =>
  ids.map((id) => new Types.ObjectId(id));

const uniqueObjectIdStrings = (values: unknown[]): string[] =>
  [...new Set(values
    .map((value) => String(value))
    .filter((value) => Types.ObjectId.isValid(value)))];

/**
 * Finds references to students whose Student document was removed outside the
 * API (for example from MongoDB Compass). The normal delete endpoint prevents
 * this state, but a direct database deletion skips cascades and cache cleanup.
 *
 * Run without flags to inspect only. Add --apply to permanently clean orphaned
 * records and invalidate the affected Redis list caches.
 */
async function cleanupStudentOrphans(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB (${APPLY_CHANGES ? 'apply mode' : 'dry-run mode'})`);

  try {
    const existingStudentIds = new Set(
      (await Student.distinct('_id')).map((id) => String(id))
    );

    const referenceValues = await Promise.all([
      ClientAuth.distinct('profileId'),
      Package.distinct('student'),
      Payment.distinct('student'),
      PaymentLink.distinct('student'),
      Attendance.distinct('student'),
      EvaluationReport.distinct('student'),
      Class.distinct('students'),
      Batch.distinct('students'),
      Staff.distinct('assignedStudents'),
      Lead.distinct('studentId'),
      Notification.distinct('recipient', { recipientType: 'Student' }),
    ]);

    const orphanStudentIds = uniqueObjectIdStrings(referenceValues.flat())
      .filter((id) => !existingStudentIds.has(id));

    if (orphanStudentIds.length === 0) {
      console.log('No orphaned student references found. Nothing to clean.');
      return;
    }

    const studentIds = toObjectIds(orphanStudentIds);
    const [
      orphanClientAuthIds,
      orphanPackageIds,
      orphanNotificationIds,
      clientAuthCount,
      packageCount,
      paymentCount,
      paymentLinkCount,
      attendanceCount,
      evaluationReportCount,
      classReferenceCount,
      batchReferenceCount,
      staffReferenceCount,
      leadReferenceCount,
      notificationCount,
    ] = await Promise.all([
      ClientAuth.distinct('_id', { profileId: { $in: studentIds } }),
      Package.distinct('_id', { student: { $in: studentIds } }),
      Notification.distinct('_id', { recipientType: 'Student', recipient: { $in: studentIds } }),
      ClientAuth.countDocuments({ profileId: { $in: studentIds } }),
      Package.countDocuments({ student: { $in: studentIds } }),
      Payment.countDocuments({ student: { $in: studentIds } }),
      PaymentLink.countDocuments({ student: { $in: studentIds } }),
      Attendance.countDocuments({ student: { $in: studentIds } }),
      EvaluationReport.countDocuments({ student: { $in: studentIds } }),
      Class.countDocuments({ students: { $in: studentIds } }),
      Batch.countDocuments({ students: { $in: studentIds } }),
      Staff.countDocuments({ assignedStudents: { $in: studentIds } }),
      Lead.countDocuments({ studentId: { $in: studentIds } }),
      Notification.countDocuments({ recipientType: 'Student', recipient: { $in: studentIds } }),
    ]);

    const clientAuthIds = uniqueObjectIdStrings(orphanClientAuthIds);
    const packageIds = uniqueObjectIdStrings(orphanPackageIds);
    const notificationIds = uniqueObjectIdStrings(orphanNotificationIds);
    const refreshTokenCount = clientAuthIds.length
      ? await RefreshToken.countDocuments({ userId: { $in: toObjectIds(clientAuthIds) } })
      : 0;
    const deliveryLogCount = notificationIds.length
      ? await DeliveryLog.countDocuments({ notificationId: { $in: toObjectIds(notificationIds) } })
      : 0;
    const paymentLinksWithDeletedPackageCount = packageIds.length
      ? await PaymentLink.countDocuments({ previousPackageId: { $in: toObjectIds(packageIds) } })
      : 0;

    const summary: CleanupSummary = {
      orphanStudentReferences: orphanStudentIds.length,
      clientAuth: clientAuthCount,
      refreshTokens: refreshTokenCount,
      packages: packageCount,
      payments: paymentCount,
      paymentLinks: paymentLinkCount,
      paymentLinksClearedOfDeletedPackage: paymentLinksWithDeletedPackageCount,
      attendance: attendanceCount,
      evaluationReports: evaluationReportCount,
      classesUpdated: classReferenceCount,
      batchesUpdated: batchReferenceCount,
      staffProfilesUpdated: staffReferenceCount,
      leadsRestored: leadReferenceCount,
      notifications: notificationCount,
      deliveryLogs: deliveryLogCount,
    };

    console.table(summary);

    if (!APPLY_CHANGES) {
      console.log('Dry run complete. Re-run with --apply to remove these orphaned records.');
      return;
    }

    const cleanupOperations: Array<Promise<unknown>> = [
      ClientAuth.deleteMany({ profileId: { $in: studentIds } }),
      Package.deleteMany({ student: { $in: studentIds } }),
      Payment.deleteMany({ student: { $in: studentIds } }),
      PaymentLink.deleteMany({ student: { $in: studentIds } }),
      Attendance.deleteMany({ student: { $in: studentIds } }),
      EvaluationReport.deleteMany({ student: { $in: studentIds } }),
      Class.updateMany({ students: { $in: studentIds } }, { $pull: { students: { $in: studentIds } } }),
      Batch.updateMany({ students: { $in: studentIds } }, { $pull: { students: { $in: studentIds } } }),
      Staff.updateMany({ assignedStudents: { $in: studentIds } }, { $pull: { assignedStudents: { $in: studentIds } } }),
      Lead.updateMany(
        { studentId: { $in: studentIds } },
        {
          $set: { convertedToStudent: false, status: LeadStatus.READY_TO_JOIN },
          $unset: { studentId: '', convertedBy: '', convertedAt: '' },
        }
      ),
      Notification.deleteMany({ recipientType: 'Student', recipient: { $in: studentIds } }),
    ];

    if (clientAuthIds.length) {
      cleanupOperations.push(RefreshToken.deleteMany({ userId: { $in: toObjectIds(clientAuthIds) } }));
    }
    if (notificationIds.length) {
      cleanupOperations.push(DeliveryLog.deleteMany({ notificationId: { $in: toObjectIds(notificationIds) } }));
    }
    if (packageIds.length) {
      cleanupOperations.push(
        PaymentLink.updateMany(
          { previousPackageId: { $in: toObjectIds(packageIds) } },
          { $unset: { previousPackageId: '' } }
        )
      );
    }

    await Promise.all(cleanupOperations);

    if (process.env.REDIS_URL) {
      await initializeRedis();
      await Promise.all([
        CacheService.deletePattern(`${CacheNamespaces.STUDENT_LIST}:*`),
        CacheService.deletePattern(`${CacheNamespaces.PACKAGE_LIST}:*`),
        CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`),
        CacheService.deletePattern(`${CacheNamespaces.CLASS_LIST}:*`),
        CacheService.deletePattern(`${CacheNamespaces.DASHBOARD_STATS}:*`),
      ]);
      console.log('Affected Redis caches cleared.');
    }

    console.log('Orphaned student data cleaned successfully. Audit logs were retained by design.');
  } finally {
    await closeRedis();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanupStudentOrphans().catch((error: unknown) => {
  console.error('Student orphan cleanup failed:', error);
  process.exitCode = 1;
});
