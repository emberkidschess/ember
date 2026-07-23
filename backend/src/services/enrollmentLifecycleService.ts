import mongoose from 'mongoose';
import Package, { PackageStatus } from '../models/Package';
import Student, {
  EnrollmentStatus,
  PortalStatus,
  StudentStatus,
} from '../models/Student';
import ClientAuth from '../models/ClientAuth';
import { AuthStatus } from '../models/BaseAuth';
import {
  CourseLevel,
  EnrollmentRuleError,
  RENEWAL_REMINDER_THRESHOLD,
  getCourseSessionTotal,
} from '../domain/courseEnrollment';
import { removeStudentFromScheduledBatchClasses } from './batchSchedulingService';

export async function assertCourseEnrollmentCapacity(
  studentId: mongoose.Types.ObjectId | string,
  courseLevel: CourseLevel,
  requestedSessions: number,
  session?: mongoose.ClientSession,
  excludePackageId?: mongoose.Types.ObjectId | string
): Promise<void> {
  const packages = await Package.find({
    student: studentId,
    courseLevel: courseLevel === 'Expert' ? { $in: ['Expert', 'Master'] } : courseLevel,
    status: { $in: [PackageStatus.ACTIVE, PackageStatus.QUEUED, PackageStatus.COMPLETED, PackageStatus.EXPIRED] },
    ...(excludePackageId ? { _id: { $ne: excludePackageId } } : {}),
  })
    .select('totalClasses')
    .session(session || null)
    .lean();
  const purchasedSessions = packages.reduce(
    (total, packageItem) => total + Number(packageItem.totalClasses || 0),
    0
  );
  const courseLimit = getCourseSessionTotal(courseLevel);
  if (purchasedSessions + requestedSessions > courseLimit) {
    throw new EnrollmentRuleError(
      `${courseLevel} allows ${courseLimit} sessions in total. ` +
        `${purchasedSessions} session(s) are already enrolled, so this plan exceeds the course limit.`
    );
  }
}

export async function assertNoActiveOrQueuedPackage(
  studentId: mongoose.Types.ObjectId | string,
  session?: mongoose.ClientSession,
  excludePackageId?: mongoose.Types.ObjectId | string
): Promise<void> {
  const query: any = {
    student: studentId,
    status: { $in: [PackageStatus.ACTIVE, PackageStatus.QUEUED] },
  };
  if (excludePackageId) query._id = { $ne: excludePackageId };

  const existingPackage = await Package.findOne(query).session(session || null);
  if (existingPackage) {
    throw new EnrollmentRuleError(
      existingPackage.status === PackageStatus.QUEUED
        ? 'This student already has a queued renewal package.'
        : 'This student already has an active package.'
    );
  }
}

export function assertPackageCanRenew(packageData: {
  status: PackageStatus;
  remainingClasses: number;
}): void {
  if (![PackageStatus.ACTIVE, PackageStatus.EXPIRED].includes(packageData.status)) {
    throw new EnrollmentRuleError('Only active or expired packages can be renewed.');
  }
  if (packageData.remainingClasses < 0) {
    throw new EnrollmentRuleError(
      'Package remaining sessions are negative. Please fix package usage before renewal.'
    );
  }
}

export function assertPackageCanUpgrade(packageData: {
  status: PackageStatus;
  remainingClasses: number;
  totalClasses: number;
  completedClasses: number;
  regularClassesCompleted: number;
}): void {
  if (packageData.status !== PackageStatus.ACTIVE) {
    throw new EnrollmentRuleError('Only an active package can be upgraded.');
  }
  if (packageData.remainingClasses < 0) {
    throw new EnrollmentRuleError(
      'Package remaining sessions are negative. Please fix package usage before upgrade.'
    );
  }
  const completedSessions = packageData.regularClassesCompleted || packageData.completedClasses || 0;
  if (completedSessions < packageData.totalClasses) {
    throw new EnrollmentRuleError(
      `Complete all ${packageData.totalClasses} sessions before upgrading this course level.`
    );
  }
}

export interface ExhaustionTransition {
  queuedPackageActivated: boolean;
  studentExpired: boolean;
  authIdToRevoke?: string;
}

export async function handleExhaustedPackage(
  packageId: mongoose.Types.ObjectId | string,
  session: mongoose.ClientSession
): Promise<ExhaustionTransition> {
  const currentPackage = await Package.findById(packageId).session(session);
  if (!currentPackage || currentPackage.remainingClasses > 0) {
    return { queuedPackageActivated: false, studentExpired: false };
  }

  const queuedPackage = currentPackage.nextPackageId
    ? await Package.findOne({
        _id: currentPackage.nextPackageId,
        status: PackageStatus.QUEUED,
      }).session(session)
    : null;

  if (queuedPackage) {
    currentPackage.status = PackageStatus.COMPLETED;
    queuedPackage.status = PackageStatus.ACTIVE;
    queuedPackage.activatedAt = new Date();
    await Promise.all([
      currentPackage.save({ session }),
      queuedPackage.save({ session }),
      Student.findByIdAndUpdate(
        currentPackage.student,
        {
          $set: {
            currentPackageId: queuedPackage._id,
            enrollmentStatus: EnrollmentStatus.ENROLLED,
            studentStatus: StudentStatus.ACTIVE,
            portalStatus: PortalStatus.ACTIVE,
          },
          $addToSet: { packageHistory: queuedPackage._id },
          $inc: { sessionVersion: 1 },
          $unset: { portalExpiryDate: '', expiredAt: '' },
        },
        { session, runValidators: true }
      ),
      ClientAuth.findOneAndUpdate(
        { profileId: currentPackage.student },
        { $set: { status: AuthStatus.ACTIVE } },
        { session }
      ),
    ]);
    return { queuedPackageActivated: true, studentExpired: false };
  }

  currentPackage.status = PackageStatus.EXPIRED;
  await currentPackage.save({ session });
  const now = new Date();
  const expiredStudent = await Student.findById(currentPackage.student)
    .select('currentBatchId')
    .session(session);
  if (expiredStudent?.currentBatchId) {
    // Keep historical batch membership for reporting, but remove the student
    // from future class rosters and attendance placeholders until renewal.
    await removeStudentFromScheduledBatchClasses(
      expiredStudent.currentBatchId,
      currentPackage.student.toString(),
      { session }
    );
  }
  await Student.findByIdAndUpdate(
    currentPackage.student,
    {
      $set: {
        enrollmentStatus: EnrollmentStatus.EXPIRED,
        portalStatus: PortalStatus.EXPIRED,
        expiredAt: now,
      },
      $inc: { sessionVersion: 1 },
    },
    { session, runValidators: true }
  );
  const clientAuth = await ClientAuth.findOneAndUpdate(
    { profileId: currentPackage.student },
    { $set: { status: AuthStatus.INACTIVE } },
    { session, new: true }
  );
  return {
    queuedPackageActivated: false,
    studentExpired: true,
    authIdToRevoke: clientAuth?._id.toString(),
  };
}

export async function claimRenewalReminder(
  packageId: mongoose.Types.ObjectId | string,
  session: mongoose.ClientSession
): Promise<boolean> {
  const result = await Package.findOneAndUpdate(
    {
      _id: packageId,
      status: PackageStatus.ACTIVE,
      remainingClasses: { $gt: 0, $lte: RENEWAL_REMINDER_THRESHOLD },
      renewalReminderSentAt: { $exists: false },
    },
    { $set: { renewalReminderSentAt: new Date() } },
    { session, new: true }
  );
  return Boolean(result);
}
