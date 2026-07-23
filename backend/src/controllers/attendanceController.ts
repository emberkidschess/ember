import { Response } from 'express';
import mongoose from 'mongoose';
import Attendance, { AttendanceStatus, AttendanceSource } from '../models/Attendance';
import { AuthRequest } from '../middleware/auth';
import { ClientAuthRequest } from '../middleware/clientAuth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import Package, { PackageStatus } from '../models/Package';
import ClientAuth from '../models/ClientAuth';
import { AuthStatus } from '../models/BaseAuth';
import Class from '../models/Class';
import Student from '../models/Student';
import Batch from '../models/Batch';
import { buildAuditLogData } from '../middleware/auditLogger';
import { classAccessWindow } from '../utils/dateTime';
import {
  claimRenewalReminder,
  handleExhaustedPackage,
} from '../services/enrollmentLifecycleService';
import { ClientAuthService } from '../services/clientAuthService';
import { sendNotification } from '../utils/notificationProcessor';
import { NotificationChannel, NotificationType } from '../models/Notification';
import { ensureBatchSessionPlan } from '../domain/courseEnrollment';
import { sanitizePaginationParams, sanitizeQueryParam } from '../utils/validation';
import { addStudentsToScheduledBatchClasses } from '../services/batchSchedulingService';

export async function finalizeClassBatchProgress(
  classId: mongoose.Types.ObjectId | string,
  session: mongoose.ClientSession
): Promise<{
  batchId?: string;
  batchJustCompleted?: boolean;
}> {
  const claimedClass = await Class.findOneAndUpdate(
    {
      _id: classId,
      classType: 'regular',
      batchProgressCounted: { $ne: true },
    },
    { $set: { batchProgressCounted: true } },
    { session, new: true }
  );

  if (!claimedClass?.batch) return {};

  const batchDoc = await Batch.findById(claimedClass.batch).session(session);
  if (!batchDoc) return {};

  ensureBatchSessionPlan(batchDoc);
  const wasOngoingBefore = batchDoc.status === 'ongoing';
  const sessionEntry = batchDoc.sessions.find(
    (item) =>
      item.classId?.toString() === claimedClass._id.toString() ||
      item.sessionNumber === claimedClass.sessionNumber
  ) || batchDoc.sessions.find((item) => item.status === 'scheduled')
    || batchDoc.sessions.find((item) => item.status === 'planned');
  if (!sessionEntry) return {};
  sessionEntry.status = 'completed';
  await batchDoc.save({ session });

  return {
    batchId: batchDoc._id.toString(),
    batchJustCompleted: wasOngoingBefore && batchDoc.status === 'completed',
  };
}

async function consumePackageForAttendance(
  studentId: any,
  classId: any,
  session: mongoose.ClientSession
): Promise<{
  success: boolean;
  error?: string;
  batchId?: string;
  batchJustCompleted?: boolean;
  creditConsumed?: boolean;
  packageId?: string;
  remainingClasses?: number;
  renewalReminderNeeded?: boolean;
  studentExpired?: boolean;
  authIdToRevoke?: string;
}> {
  const classData = await Class.findById(classId).session(session);
  if (!classData) {
    return { success: false, error: 'Class not found' };
  }

  // Trial and legacy benefit classes are informational and never consume a
  // purchased course session.
  if (classData.classType !== 'regular') {
    return { success: true, creditConsumed: false };
  }

  const updatedPackage = await Package.findOneAndUpdate(
    { student: studentId, status: PackageStatus.ACTIVE, remainingClasses: { $gt: 0 } },
    {
      $inc: {
        regularClassesCompleted: 1,
        completedClasses: 1,
        remainingClasses: -1,
      },
    },
    { session, new: true }
  );

  if (!updatedPackage) {
    return {
      success: false,
      error: 'No active session plan or no remaining sessions for this student',
    };
  }

  const renewalReminderNeeded = await claimRenewalReminder(updatedPackage._id, session);
  const exhaustion =
    updatedPackage.remainingClasses === 0
      ? await handleExhaustedPackage(updatedPackage._id, session)
      : { queuedPackageActivated: false, studentExpired: false };

  return {
    success: true,
    creditConsumed: true,
    packageId: updatedPackage._id.toString(),
    remainingClasses: updatedPackage.remainingClasses,
    renewalReminderNeeded,
    studentExpired: exhaustion.studentExpired,
    authIdToRevoke: exhaustion.authIdToRevoke,
  };
}

/**
 * Symmetric reversal of consumePackageForAttendance - used when a PRESENT
 * mark is undone (coach override back to ABSENT, or a dispute is rejected
 * after having been tentatively approved).
 */
export async function reversePackageConsumption(
  studentId: any,
  classId: any,
  session: mongoose.ClientSession,
  consumedPackageId?: mongoose.Types.ObjectId | string,
): Promise<void> {
  const classData = await Class.findById(classId).session(session);
  if (!classData || classData.classType !== 'regular') return;

  const student = await Student.findById(studentId).session(session);
  if (!student || (!student.currentPackageId && !consumedPackageId)) return;

  const packageData = await Package.findById(consumedPackageId || student.currentPackageId).session(session);
  if (!packageData) return;

  const currentValue = packageData.regularClassesCompleted || 0;
  if (currentValue <= 0) return;

  const wasExhausted =
    [PackageStatus.COMPLETED, PackageStatus.EXPIRED].includes(packageData.status) &&
    packageData.remainingClasses === 0;
  const isCurrentPackage = student.currentPackageId?.toString() === packageData._id.toString();
  await Package.findByIdAndUpdate(
    packageData._id,
    {
      $inc: {
        regularClassesCompleted: -1,
        completedClasses: -1,
        remainingClasses: 1,
      },
      ...(wasExhausted && isCurrentPackage ? { $set: { status: PackageStatus.ACTIVE } } : {}),
    },
    { session }
  );

  // Undoing the final attendance of the current expired package restores
  // access and rebuilds only future roster entries. A completed package with
  // a queued renewal is not current, so it must not take over the student.
  if (wasExhausted && isCurrentPackage) {
    await Student.findByIdAndUpdate(
      student._id,
      {
        $set: {
          enrollmentStatus: 'enrolled',
          studentStatus: 'active',
          portalStatus: 'active',
        },
        $unset: { expiredAt: '', portalExpiryDate: '' },
        $inc: { sessionVersion: 1 },
      },
      { session, runValidators: true }
    );
    await ClientAuth.findOneAndUpdate(
      { profileId: student._id },
      { $set: { status: AuthStatus.ACTIVE } },
      { session }
    );
    if (student.currentBatchId) {
      await addStudentsToScheduledBatchClasses(
        student.currentBatchId,
        [student._id.toString()],
        { session }
      );
    }
  }

}

/**
 * Fires the actual notifications for the two Batch triggers set by the
 * pre-save hook. Always called AFTER the attendance transaction commits -
 * an email/notification failure here must never roll back a real
 * attendance mark or package consumption.
 */
export async function fireBatchTriggerNotifications(
  batchId: string,
  batchJustCompleted: boolean
): Promise<void> {
  if (!batchJustCompleted) return;

  try {
    const batchDoc = await Batch.findById(batchId).populate('coach', 'name email').lean();
    if (!batchDoc) return;
    const b = batchDoc as any;

    const Student = (await import('../models/Student')).default;
    const emailService = (await import('../services/emailService')).default;
    const students = await Student.find({ _id: { $in: b.students } }).select('email parentName studentName').lean();

    if (batchJustCompleted) {
      for (const s of students as any[]) {
        try {
          await emailService.sendTemplatedEmail(s.email, 'batch_completed', {
            parentName: s.parentName,
            studentName: s.studentName,
            batchName: b.name,
            courseLevel: b.courseLevel,
          });
        } catch (e) {
          console.error(`Batch-completed email failed for ${s.email}:`, e);
        }
      }
    }
  } catch (error) {
    console.error('Error firing batch trigger notifications:', error);
  }
}

async function firePackageSessionNotifications(
  studentId: string,
  remainingClasses?: number,
  renewalReminderNeeded?: boolean,
  studentExpired?: boolean,
  authIdToRevoke?: string
): Promise<void> {
  if (authIdToRevoke) {
    await ClientAuthService.revokeAllTokens(authIdToRevoke);
  }
  if (renewalReminderNeeded && remainingClasses !== undefined) {
    await sendNotification(
      studentId,
      NotificationType.PACKAGE_NEAR_COMPLETION,
      NotificationChannel.EMAIL,
      {
        subject: `${remainingClasses} session(s) remaining - renew to continue`,
        body: `Your active session plan has ${remainingClasses} session(s) left. Renew now to continue without interruption.`,
        data: { remainingClasses },
      }
    );
  }
  if (studentExpired) {
    await sendNotification(
      studentId,
      NotificationType.PACKAGE_COMPLETION,
      NotificationChannel.EMAIL,
      {
        subject: 'Session plan completed - renewal required',
        body: 'All purchased sessions are complete. Renew your enrollment to restore dashboard and course access.',
      }
    );
  }
}

export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { student, coach, status, dateFrom, dateTo, page = '1', limit = '100' } = req.query;

    const filter: any = {};

    const sanitizedStudent = sanitizeQueryParam(student);
    const sanitizedCoach = sanitizeQueryParam(coach);
    const sanitizedStatus = sanitizeQueryParam(status);
    if (sanitizedStudent) filter.student = sanitizedStudent;
    if (sanitizedCoach) filter.coach = sanitizedCoach;
    if (sanitizedStatus) filter.status = sanitizedStatus;
    if (dateFrom || dateTo) {
      filter.markedAt = {};
      const sanitizedDateFrom = sanitizeQueryParam(dateFrom);
      const sanitizedDateTo = sanitizeQueryParam(dateTo);
      if (sanitizedDateFrom) filter.markedAt.$gte = new Date(sanitizedDateFrom);
      if (sanitizedDateTo) filter.markedAt.$lte = new Date(sanitizedDateTo);
    }

    const { page: pageNum, limit: limitNum } = sanitizePaginationParams(page, limit);
    const skip = (pageNum - 1) * limitNum;

    const [attendance, total] = await Promise.all([
      Attendance.find(filter)
        .populate('class', 'course date startTime endTime classType')
        .populate('student', 'studentName parentName email phoneNumber')
        .populate('coach', 'name email')
        .populate('markedBy', 'name email')
        .select('class student coach status source markedBy markedAt joinClickedAt notes attendanceConsumed disputeReason disputeRaisedAt disputeResolvedAt disputeResolvedBy disputeApproved createdAt')
        .sort({ markedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance records',
    });
  }
};

/**
 * Queue of disputed attendance records awaiting a coach's review/decision.
 */
export const getDisputedAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { coach } = req.query;
    const filter: any = { status: AttendanceStatus.DISPUTED };
    const sanitizedCoach = sanitizeQueryParam(coach);
    if (sanitizedCoach) filter.coach = sanitizedCoach;

    const disputes = await Attendance.find(filter)
      .populate('class', 'course date startTime endTime classType')
      .populate('student', 'studentName parentName email')
      .populate('coach', 'name email')
      .select('class student coach status source markedAt notes disputeReason disputeRaisedAt disputeResolvedAt createdAt')
      .sort({ disputeRaisedAt: 1 })
      .limit(100)
      .lean(); // oldest first - FIFO queue

    res.json({
      success: true,
      data: disputes,
    });
  } catch (error) {
    console.error('Error fetching disputed attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch disputed attendance',
    });
  }
};

export const getAttendanceById = async (req: AuthRequest, res: Response) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('class', 'course date startTime endTime classType')
      .populate('student', 'studentName parentName email phoneNumber')
      .populate('coach', 'name email')
      .populate('markedBy', 'name email');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance record',
    });
  }
};

/**
 * Student clicks "Join Now" from their dashboard. Marks PRESENT and
 * consumes the package credit immediately - this is the primary, intended
 * path to a PRESENT mark (the cron job in scripts/markAbsentees.ts is the
 * fallback for everyone who DIDN'T click).
 *
 * Idempotent: re-clicking an already-PRESENT record is a no-op success
 * (the student may refresh/click again without side effects).
 */
export const joinClass = async (req: ClientAuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const studentId = req.client!.profileId;
    const { classId } = req.body;

    const student = await Student.findById(studentId).session(session);
    if (!student) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    if (student.portalStatus === 'frozen') {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        error: 'Your portal is currently paused. Please contact us to resume your classes.',
      });
    }
    if (student.portalStatus === 'expired') {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        error: 'Your portal access has expired. Please contact us to renew your package.',
      });
    }

    const classData = await Class.findById(classId).session(session);
    if (!classData) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    // Enforce the join window: can't join before the class starts, and
    // can't join after it has ended (the cron job owns marking absentees
    // past this point).
    const now = new Date();
    const { opensAt, closesAt } = classAccessWindow(classData);

    if (classData.status !== 'scheduled') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'This class is not active' });
    }
    if (now < opensAt) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'This class is not open yet. Join becomes available shortly before the scheduled time.',
      });
    }
    if (now > closesAt) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'This class has already ended. If you joined but missed clicking, use the Dispute option.',
      });
    }
    if (!classData.meetingLink) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'The meeting link is not available yet. Please contact your coach.',
      });
    }

    const attendance = await Attendance.findOne({ class: classId, student: studentId }).session(session);

    if (!attendance) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'No attendance record found for this class. Please contact your coach.',
      });
    }

    if (attendance.status === AttendanceStatus.PRESENT) {
      await session.commitTransaction();
      return res.json({
        success: true,
        data: { meetingLink: classData.meetingLink },
        message: 'Already marked present',
      });
    }

    const consumeResult = await consumePackageForAttendance(studentId, classId, session);
    if (!consumeResult.success) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: consumeResult.error });
    }

    attendance.status = AttendanceStatus.PRESENT;
    attendance.source = AttendanceSource.STUDENT_CLICK;
    attendance.joinClickedAt = now;
    attendance.markedAt = now;
    attendance.attendanceConsumed = !!consumeResult.creditConsumed;
    attendance.consumedPackageId = consumeResult.creditConsumed
      ? consumeResult.packageId as any
      : undefined;
    await attendance.save({ session });

    await AuditLog.create([{
      studentId,
      userEmail: student.email,
      userName: student.studentName,
      userRole: 'student',
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.ATTENDANCE,
      entityId: attendance._id,
      entityName: `Join Now clicked for class ${classId}`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true,
    }], { session });

    await session.commitTransaction();

    if (consumeResult.batchId) {
      fireBatchTriggerNotifications(consumeResult.batchId, !!consumeResult.batchJustCompleted).catch((e) =>
        console.error('fireBatchTriggerNotifications error:', e)
      );
    }
    firePackageSessionNotifications(
      studentId.toString(),
      consumeResult.remainingClasses,
      consumeResult.renewalReminderNeeded,
      consumeResult.studentExpired,
      consumeResult.authIdToRevoke
    ).catch((e) => console.error('firePackageSessionNotifications error:', e));

    res.json({
      success: true,
      data: { meetingLink: classData.meetingLink },
      message: 'Attendance marked present',
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error joining class:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark attendance',
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Student raises a dispute: "I joined via the link but forgot to click."
 * Only valid on an ABSENT record - and only the student's own record.
 * Moves the record into the coach's review queue (status DISPUTED);
 * package consumption is NOT applied yet - that only happens if the
 * dispute is approved.
 */
export const raiseDispute = async (req: ClientAuthRequest, res: Response) => {
  try {
    const studentId = req.client!.profileId;
    const { disputeReason } = req.body;

    const attendance = await Attendance.findOne({ _id: req.params.id, student: studentId });
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found or does not belong to you',
      });
    }

    if (attendance.status !== AttendanceStatus.ABSENT) {
      return res.status(400).json({
        success: false,
        error: `Only an absent record can be disputed (current status: ${attendance.status})`,
      });
    }

    attendance.status = AttendanceStatus.DISPUTED;
    attendance.source = AttendanceSource.STUDENT_DISPUTE;
    attendance.disputeReason = disputeReason;
    attendance.disputeRaisedAt = new Date();
    await attendance.save();

    const student = await Student.findById(studentId).select('email studentName');

    await AuditLog.create({
      studentId,
      userEmail: student?.email || 'unknown',
      userName: student?.studentName || 'Unknown',
      userRole: 'student',
      action: AuditAction.ATTENDANCE_DISPUTE_RAISED,
      entityType: AuditEntityType.ATTENDANCE,
      entityId: attendance._id,
      entityName: `Dispute raised for class ${attendance.class}`,
      details: { disputeReason },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      success: true,
    });

    res.json({
      success: true,
      data: attendance,
      message: 'Dispute submitted. Your coach will review it shortly.',
    });
  } catch (error) {
    console.error('Error raising dispute:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to raise dispute',
    });
  }
};

/**
 * Coach reviews a DISPUTED record and approves or rejects it.
 *   approved=true  -> status PRESENT, package consumption applied
 *   approved=false -> status ABSENT, stays as-is, no consumption
 */
export const resolveDispute = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { approved, notes } = req.body as { approved: boolean; notes?: string };
    let batchTriggerInfo: {
      batchId?: string;
      batchJustCompleted?: boolean;
      remainingClasses?: number;
      renewalReminderNeeded?: boolean;
      studentExpired?: boolean;
      authIdToRevoke?: string;
    } = {};

    const attendance = await Attendance.findById(req.params.id).session(session);
    if (!attendance) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Attendance record not found' });
    }

    if (attendance.status !== AttendanceStatus.DISPUTED) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: `This record is not currently disputed (status: ${attendance.status})`,
      });
    }

    if (approved) {
      const consumeResult = await consumePackageForAttendance(attendance.student, attendance.class, session);
      if (!consumeResult.success) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, error: consumeResult.error });
      }
      batchTriggerInfo = {
        batchId: consumeResult.batchId,
        batchJustCompleted: consumeResult.batchJustCompleted,
        remainingClasses: consumeResult.remainingClasses,
        renewalReminderNeeded: consumeResult.renewalReminderNeeded,
        studentExpired: consumeResult.studentExpired,
        authIdToRevoke: consumeResult.authIdToRevoke,
      };
      attendance.status = AttendanceStatus.PRESENT;
      attendance.attendanceConsumed = !!consumeResult.creditConsumed;
      attendance.consumedPackageId = consumeResult.creditConsumed
        ? consumeResult.packageId as any
        : undefined;
    } else {
      attendance.status = AttendanceStatus.ABSENT;
      attendance.consumedPackageId = undefined;
    }

    attendance.disputeApproved = approved;
    attendance.disputeResolvedAt = new Date();
    attendance.disputeResolvedBy = req.user?.userId as any;
    if (notes) attendance.notes = notes;
    await attendance.save({ session });

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.ATTENDANCE_DISPUTE_RESOLVED,
      entityType: AuditEntityType.ATTENDANCE,
      entityId: attendance._id,
      entityName: `Dispute ${approved ? 'approved' : 'rejected'} for class ${attendance.class}`,
      details: { approved, notes },
      success: true,
    })], { session });

    await session.commitTransaction();

    if (approved && batchTriggerInfo.batchId) {
      fireBatchTriggerNotifications(batchTriggerInfo.batchId, !!batchTriggerInfo.batchJustCompleted).catch((e) =>
        console.error('fireBatchTriggerNotifications error:', e)
      );
    }
    if (approved) {
      firePackageSessionNotifications(
        attendance.student.toString(),
        batchTriggerInfo.remainingClasses,
        batchTriggerInfo.renewalReminderNeeded,
        batchTriggerInfo.studentExpired,
        batchTriggerInfo.authIdToRevoke
      ).catch((e) => console.error('firePackageSessionNotifications error:', e));
    }

    res.json({
      success: true,
      data: attendance,
      message: `Dispute ${approved ? 'approved - marked present' : 'rejected - remains absent'}`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error resolving dispute:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve dispute',
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Coach's manual override toggle - directly corrects ABSENT<->PRESENT
 * without going through the dispute queue (e.g. coach remembers the
 * student was actually there, or wants to proactively correct a mistake).
 * Symmetric package consumption/reversal applied as needed.
 */
export const overrideAttendance = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status, notes } = req.body as { status: AttendanceStatus.PRESENT | AttendanceStatus.ABSENT; notes?: string };
    let batchTriggerInfo: {
      batchId?: string;
      batchJustCompleted?: boolean;
      remainingClasses?: number;
      renewalReminderNeeded?: boolean;
      studentExpired?: boolean;
      authIdToRevoke?: string;
    } = {};

    const attendance = await Attendance.findById(req.params.id).session(session);
    if (!attendance) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Attendance record not found' });
    }

    const oldStatus = attendance.status;

    if (oldStatus === status) {
      await session.commitTransaction();
      return res.json({ success: true, data: attendance, message: 'No change - already in that state' });
    }

    if (status === AttendanceStatus.PRESENT && !attendance.attendanceConsumed) {
      const consumeResult = await consumePackageForAttendance(attendance.student, attendance.class, session);
      if (!consumeResult.success) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, error: consumeResult.error });
      }
      batchTriggerInfo = {
        batchId: consumeResult.batchId,
        batchJustCompleted: consumeResult.batchJustCompleted,
        remainingClasses: consumeResult.remainingClasses,
        renewalReminderNeeded: consumeResult.renewalReminderNeeded,
        studentExpired: consumeResult.studentExpired,
        authIdToRevoke: consumeResult.authIdToRevoke,
      };
      attendance.attendanceConsumed = !!consumeResult.creditConsumed;
      attendance.consumedPackageId = consumeResult.creditConsumed
        ? consumeResult.packageId as any
        : undefined;
    } else if (status === AttendanceStatus.ABSENT && attendance.attendanceConsumed) {
      await reversePackageConsumption(
        attendance.student,
        attendance.class,
        session,
        attendance.consumedPackageId
      );
      attendance.attendanceConsumed = false;
      attendance.consumedPackageId = undefined;
    }

    attendance.status = status;
    attendance.source = AttendanceSource.COACH_OVERRIDE;
    attendance.markedBy = req.user?.userId as any;
    attendance.markedAt = new Date();
    if (notes) attendance.notes = notes;
    await attendance.save({ session });

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.ATTENDANCE_OVERRIDDEN,
      entityType: AuditEntityType.ATTENDANCE,
      entityId: attendance._id,
      entityName: `Attendance overridden ${oldStatus} -> ${status}`,
      details: { oldStatus, newStatus: status, notes },
      success: true,
    })], { session });

    await session.commitTransaction();

    if (batchTriggerInfo.batchId) {
      fireBatchTriggerNotifications(batchTriggerInfo.batchId, !!batchTriggerInfo.batchJustCompleted).catch((e) =>
        console.error('fireBatchTriggerNotifications error:', e)
      );
    }
    if (status === AttendanceStatus.PRESENT) {
      firePackageSessionNotifications(
        attendance.student.toString(),
        batchTriggerInfo.remainingClasses,
        batchTriggerInfo.renewalReminderNeeded,
        batchTriggerInfo.studentExpired,
        batchTriggerInfo.authIdToRevoke
      ).catch((e) => console.error('firePackageSessionNotifications error:', e));
    }

    res.json({
      success: true,
      data: attendance,
      message: `Attendance corrected to ${status}`,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error overriding attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to override attendance',
    });
  } finally {
    await session.endSession();
  }
};

export const deleteAttendance = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const attendance = await Attendance.findById(req.params.id).session(session);

    if (!attendance) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    if (attendance.attendanceConsumed) {
      await reversePackageConsumption(
        attendance.student,
        attendance.class,
        session,
        attendance.consumedPackageId
      );
    }

    await Attendance.findByIdAndDelete(req.params.id).session(session);

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.DELETE,
      entityType: AuditEntityType.ATTENDANCE,
      entityId: attendance._id,
      entityName: `Attendance for class ${attendance.class}`,
      success: true,
    })], { session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Attendance deleted successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attendance',
    });
  } finally {
    await session.endSession();
  }
};

export const getAttendanceStats = async (req: AuthRequest, res: Response) => {
  try {
    const { student, coach } = req.query;

    const filter: any = {};
    const sanitizedStudent = sanitizeQueryParam(student);
    const sanitizedCoach = sanitizeQueryParam(coach);
    if (sanitizedStudent) filter.student = sanitizedStudent;
    if (sanitizedCoach) filter.coach = sanitizedCoach;

    const grouped = await Attendance.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(grouped.map((item) => [item._id, item.count]));
    const present = byStatus[AttendanceStatus.PRESENT] || 0;
    const absent = byStatus[AttendanceStatus.ABSENT] || 0;
    const disputed = byStatus[AttendanceStatus.DISPUTED] || 0;
    const notMarked = byStatus[AttendanceStatus.NOT_MARKED] || 0;
    const total = present + absent + disputed + notMarked;
    const markedTotal = present + absent;
    const attendanceRate = markedTotal > 0 ? ((present / markedTotal) * 100).toFixed(2) : '0';

    res.json({
      success: true,
      data: {
        total,
        present,
        absent,
        disputed,
        notMarked,
        attendanceRate: parseFloat(attendanceRate),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance statistics',
    });
  }
};
