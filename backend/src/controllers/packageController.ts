import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Package, { PackageStatus } from '../models/Package';
import Student, { EnrollmentStatus, PortalStatus, StudentStatus } from '../models/Student';
import ClientAuth from '../models/ClientAuth';
import { AuthStatus } from '../models/BaseAuth';
import { AuthRequest } from '../middleware/auth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { validateStudent } from '../utils/foreignKeys';
import { buildAuditLogData } from '../middleware/auditLogger';
import { ClientAuthService } from '../services/clientAuthService';
import {
  COURSE_LEVELS,
  CourseLevel,
  EnrollmentRuleError,
  normalizeCourseLevel,
  validateSessionPlan,
} from '../domain/courseEnrollment';
import {
  assertCourseEnrollmentCapacity,
  assertNoActiveOrQueuedPackage,
  assertPackageCanRenew,
  assertPackageCanUpgrade,
} from '../services/enrollmentLifecycleService';

function sendPackageError(res: Response, error: unknown, fallback: string) {
  const isRuleError = error instanceof EnrollmentRuleError;
  return res.status(isRuleError ? 400 : 500).json({
    success: false,
    error: isRuleError ? error.message : fallback,
  });
}

async function linkActivePackageToStudent(
  studentId: mongoose.Types.ObjectId | string,
  packageId: mongoose.Types.ObjectId | string,
  session: mongoose.ClientSession
): Promise<string | null> {
  const student = await Student.findById(studentId).session(session);
  if (!student) {
    throw new Error('Student not found');
  }

  const restoringExpiredPortal = student.portalStatus === PortalStatus.EXPIRED;
  const portalStatus = restoringExpiredPortal ? PortalStatus.ACTIVE : student.portalStatus || PortalStatus.ACTIVE;
  const update: any = {
    $set: {
      currentPackageId: packageId,
      enrollmentStatus: EnrollmentStatus.ENROLLED,
      studentStatus: StudentStatus.ACTIVE,
      portalStatus,
    },
    $addToSet: { packageHistory: packageId },
    $inc: { sessionVersion: 1 },
  };

  if (restoringExpiredPortal) {
    update.$unset = {
      portalExpiryDate: '',
      expiredAt: '',
      frozenAt: '',
      frozenBy: '',
      frozenReason: '',
      unfrozenAt: '',
      unfrozenBy: '',
    };
  }

  await Student.findByIdAndUpdate(student._id, update, { session, runValidators: true });

  const clientAuth = await ClientAuth.findOneAndUpdate(
    { profileId: student._id },
    { $set: { email: student.email, status: AuthStatus.ACTIVE } },
    { session, new: true }
  );

  return clientAuth?._id.toString() || null;
}


export const getPackages = async (req: AuthRequest, res: Response) => {
  try {
    const { student, status, courseLevel } = req.query;
    
    const filter: any = {};
    
    if (student) filter.student = student;
    if (status) filter.status = status;
    if (courseLevel) filter.courseLevel = courseLevel;

    const packages = await Package.find(filter)
      .populate('student', 'studentName parentName email phone')
      .populate('previousPackageId', 'packageType courseLevel status')
      .populate('nextPackageId', 'packageType courseLevel status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: packages,
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch packages',
    });
  }
};

export const getPackageById = async (req: AuthRequest, res: Response) => {
  try {
    const packageData = await Package.findById(req.params.id)
      .populate('student', 'studentName parentName email phone')
      .populate('previousPackageId', 'packageType courseLevel status')
      .populate('nextPackageId', 'packageType courseLevel status');
    
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: 'Package not found',
      });
    }

    res.json({
      success: true,
      data: packageData,
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch package',
    });
  }
};

export const createPackage = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    await validateStudent(req.body.student);
    const plan = validateSessionPlan(req.body.courseLevel, req.body.packageType);
    await assertCourseEnrollmentCapacity(
      req.body.student,
      plan.courseLevel,
      plan.sessions,
      session
    );

    await assertNoActiveOrQueuedPackage(req.body.student, session);

    const packageData = await Package.create([{
      ...req.body,
      courseLevel: plan.courseLevel,
      packageType: plan.packageType,
      totalClasses: plan.sessions,
      completedClasses: 0,
      remainingClasses: plan.sessions,
      regularClassesCompleted: 0,
      status: PackageStatus.ACTIVE,
      activatedBy: req.user?.userId,
      activatedAt: new Date(),
      createdBy: req.user?.userId,
    }], { session });

    const authIdToRevoke = await linkActivePackageToStudent(req.body.student, packageData[0]._id, session);

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PACKAGE,
      entityId: packageData[0]._id,
      entityName: `Package for ${req.body.courseLevel}`,
      success: true,
    })], { session });

    await session.commitTransaction();

    if (authIdToRevoke) {
      try {
        await ClientAuthService.revokeAllTokens(authIdToRevoke);
      } catch (tokenError) {
        console.error('Failed to revoke student tokens after package creation:', tokenError);
      }
    }

    res.status(201).json({
      success: true,
      data: packageData[0],
      message: 'Package created and linked to student successfully.',
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating package:', error);
    sendPackageError(res, error, 'Failed to create package');
  } finally {
    await session.endSession();
  }
};

export const updatePackage = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const packageData = await Package.findById(req.params.id);
    
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: 'Package not found',
      });
    }

    // Active and queued packages participate in live access transitions and
    // must remain immutable once linked.
    if ([PackageStatus.ACTIVE, PackageStatus.QUEUED].includes(packageData.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify an active or queued package.',
      });
    }

    const plan = validateSessionPlan(
      req.body.courseLevel ?? packageData.courseLevel,
      req.body.packageType ?? packageData.packageType
    );
    if (packageData.regularClassesCompleted > plan.sessions) {
      return res.status(400).json({
        success: false,
        error: `This package already has ${packageData.regularClassesCompleted} used sessions and cannot be reduced to ${plan.sessions}.`,
      });
    }
    await assertCourseEnrollmentCapacity(
      packageData.student,
      plan.courseLevel,
      plan.sessions,
      undefined,
      packageData._id
    );

    const allowedUpdates = {
      courseLevel: plan.courseLevel,
      packageType: plan.packageType,
      totalClasses: plan.sessions,
      completedClasses: packageData.regularClassesCompleted,
      remainingClasses: Math.max(0, plan.sessions - packageData.regularClassesCompleted),
    };
    
    const updated = await Package.findByIdAndUpdate(req.params.id, allowedUpdates, {
      new: true,
      runValidators: true,
    });

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PACKAGE,
      entityId: packageData._id,
      entityName: `Package for ${packageData.courseLevel}`,
      details: allowedUpdates,
      success: true,
    }));

    res.json({
      success: true,
      data: updated,
      message: 'Package updated successfully',
    });
  } catch (error) {
    console.error('Error updating package:', error);
    sendPackageError(res, error, 'Failed to update package');
  }
};

export const deletePackage = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const packageData = await Package.findById(req.params.id);
    
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: 'Package not found',
      });
    }

    // Linked live packages cannot be removed from the renewal chain.
    if ([PackageStatus.ACTIVE, PackageStatus.QUEUED].includes(packageData.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete an active or queued package.',
      });
    }

    const Payment = (await import('../models/Payment')).default;
    const EvaluationReport = (await import('../models/EvaluationReport')).default;
    const Attendance = (await import('../models/Attendance')).default;
    const [paymentCount, reportCount, linkedPackageCount, attendanceCount] = await Promise.all([
      Payment.countDocuments({ package: packageData._id }),
      EvaluationReport.countDocuments({ package: packageData._id }),
      Package.countDocuments({
        $or: [{ previousPackageId: packageData._id }, { nextPackageId: packageData._id }],
      }),
      Attendance.countDocuments({ package: packageData._id }),
    ]);
    if (paymentCount + reportCount + linkedPackageCount + attendanceCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a package linked to payment, report-card, attendance, or renewal history.',
      });
    }
    if (packageData.completedClasses > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete a package with completed class history.',
      });
    }

    // Update student record if this is their current package
    await Student.updateMany(
      { currentPackageId: packageData._id },
      { $unset: { currentPackageId: '' } }
    );

    await Student.findByIdAndUpdate(packageData.student, {
      $pull: { packageHistory: packageData._id },
    });

    await Package.findByIdAndDelete(req.params.id);

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.DELETE,
      entityType: AuditEntityType.PACKAGE,
      entityId: packageData._id,
      entityName: `Package for ${packageData.courseLevel}`,
      success: true,
    }));

    res.json({
      success: true,
      message: 'Package deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete package',
    });
  }
};

export const getPackageStats = async (req: AuthRequest, res: Response) => {
  try {
    const total = await Package.countDocuments();
    const active = await Package.countDocuments({ status: PackageStatus.ACTIVE });
    const completed = await Package.countDocuments({ status: PackageStatus.COMPLETED });
    const expired = await Package.countDocuments({ status: PackageStatus.EXPIRED });
    const upgraded = await Package.countDocuments({ status: PackageStatus.UPGRADED });

    const beginnerCount = await Package.countDocuments({ courseLevel: 'Beginner' });
    const intermediateCount = await Package.countDocuments({ courseLevel: 'Intermediate' });
    const advancedCount = await Package.countDocuments({ courseLevel: 'Advanced' });
    const expertCount = await Package.countDocuments({ courseLevel: 'Expert' });

    res.json({
      success: true,
      data: {
        total,
        active,
        completed,
        expired,
        upgraded,
        byLevel: {
          beginner: beginnerCount,
          intermediate: intermediateCount,
          advanced: advancedCount,
          expert: expertCount,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching package stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch package statistics',
    });
  }
};

export const renewPackage = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { packageId } = req.params;
    const { packageType } = req.body;
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const oldPackage = await Package.findById(packageId).session(session);
    if (!oldPackage) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Package not found',
      });
    }

    if (oldPackage.nextPackageId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'A renewal is already queued for this package.',
      });
    }
    assertPackageCanRenew(oldPackage);
    const renewalLevel = normalizeCourseLevel(oldPackage.courseLevel);
    const plan = validateSessionPlan(renewalLevel, packageType);
    await assertCourseEnrollmentCapacity(
      oldPackage.student,
      plan.courseLevel,
      plan.sessions,
      session
    );
    const activateImmediately = oldPackage.remainingClasses === 0;

    const newPackage = await Package.create([{
      student: oldPackage.student,
      packageType: plan.packageType,
      courseLevel: plan.courseLevel,
      totalClasses: plan.sessions,
      completedClasses: 0,
      remainingClasses: plan.sessions,
      regularClassesCompleted: 0,
      enrollmentDate: new Date(),
      status: activateImmediately ? PackageStatus.ACTIVE : PackageStatus.QUEUED,
      previousPackageId: oldPackage._id,
      activatedBy: req.user?.userId,
      activatedAt: activateImmediately ? new Date() : undefined,
    }], { session });

    const newPackageId = newPackage[0]._id;

    await Package.findByIdAndUpdate(
      packageId,
      activateImmediately
        ? {
            $set: { status: PackageStatus.COMPLETED, nextPackageId: newPackageId },
            $push: { statusHistory: { status: PackageStatus.COMPLETED, changedAt: new Date() } },
          }
        : { $set: { nextPackageId: newPackageId } },
      { session }
    );

    const authIdToRevoke = activateImmediately
      ? await linkActivePackageToStudent(oldPackage.student, newPackageId, session)
      : null;
    if (!activateImmediately) {
      await Student.findByIdAndUpdate(
        oldPackage.student,
        { $addToSet: { packageHistory: newPackageId } },
        { session }
      );
    }

    await session.commitTransaction();

    if (authIdToRevoke) {
      try {
        await ClientAuthService.revokeAllTokens(authIdToRevoke);
      } catch (tokenError) {
        console.error('Failed to revoke student tokens after package renewal:', tokenError);
      }
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PACKAGE,
      entityId: newPackageId,
      entityName: `Package renewal for ${oldPackage.courseLevel}`,
      details: { previousPackage: packageId },
      success: true,
    }));

    res.status(201).json({
      success: true,
      data: newPackage[0],
      message: activateImmediately
        ? 'Session plan renewed and activated successfully'
        : 'Renewal confirmed and queued for automatic activation',
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error renewing package:', error);
    sendPackageError(res, error, 'Failed to renew package');
  } finally {
    await session.endSession();
  }
};

export const upgradePackage = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { packageId } = req.params;
    const { newCourseLevel, packageType } = req.body;
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const oldPackage = await Package.findById(packageId).session(session);
    if (!oldPackage) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Package not found',
      });
    }
    assertPackageCanUpgrade(oldPackage);

    const student = await Student.findOne({
      _id: oldPackage.student,
      currentPackageId: oldPackage._id,
    }).session(session);
    if (!student) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: "This package is not the student's current active package.",
      });
    }

    const levelProgression = [...COURSE_LEVELS];
    const currentLevel = normalizeCourseLevel(oldPackage.courseLevel);
    const currentIndex = levelProgression.indexOf(currentLevel as CourseLevel);
    const newIndex = levelProgression.indexOf(newCourseLevel as CourseLevel);

    // Only allow upgrading to the next level in sequence (no skipping)
    if (newIndex !== currentIndex + 1) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Can only upgrade to the next level in sequence',
      });
    }
    const plan = validateSessionPlan(newCourseLevel, packageType);
    await assertCourseEnrollmentCapacity(
      oldPackage.student,
      plan.courseLevel,
      plan.sessions,
      session
    );

    const newPackage = await Package.create([{
      student: oldPackage.student,
      packageType: plan.packageType,
      courseLevel: newCourseLevel,
      totalClasses: plan.sessions,
      completedClasses: 0,
      remainingClasses: plan.sessions,
      regularClassesCompleted: 0,
      enrollmentDate: new Date(),
      status: PackageStatus.ACTIVE,
      previousPackageId: oldPackage._id,
      activatedBy: req.user?.userId,
      activatedAt: new Date(),
    }], { session });

    const newPackageId = newPackage[0]._id;

    await Package.findByIdAndUpdate(packageId, {
      $set: { status: PackageStatus.UPGRADED, nextPackageId: newPackageId },
      $push: { statusHistory: { status: PackageStatus.UPGRADED, changedAt: new Date() } },
    }, { session });

    const authIdToRevoke = await linkActivePackageToStudent(oldPackage.student, newPackageId, session);

    await session.commitTransaction();

    if (authIdToRevoke) {
      try {
        await ClientAuthService.revokeAllTokens(authIdToRevoke);
      } catch (tokenError) {
        console.error('Failed to revoke student tokens after package upgrade:', tokenError);
      }
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PACKAGE,
      entityId: newPackageId,
      entityName: `Package upgrade from ${oldPackage.courseLevel} to ${newCourseLevel}`,
      details: { previousPackage: packageId, newCourseLevel },
      success: true,
    }));

    res.status(201).json({
      success: true,
      data: newPackage[0],
      message: `Package upgraded to ${newCourseLevel} successfully`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error upgrading package:', error);
    sendPackageError(res, error, 'Failed to upgrade package');
  } finally {
    await session.endSession();
  }
};

export const getStudentPackages = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const packages = await Package.find({ student: studentId })
      .populate('previousPackageId', 'packageType courseLevel status')
      .populate('nextPackageId', 'packageType courseLevel status')
      .sort({ createdAt: -1 });

    const currentPackage = packages.find(p => p.status === PackageStatus.ACTIVE);
    const packageHistory = packages.filter(p => p.status !== PackageStatus.ACTIVE);

    res.json({
      success: true,
      data: {
        currentPackage,
        packageHistory,
        allPackages: packages,
      },
    });
  } catch (error) {
    console.error('Error fetching student packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student packages',
    });
  }
};
