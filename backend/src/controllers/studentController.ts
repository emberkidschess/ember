import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Student, { StudentStatus, EnrollmentStatus, PortalStatus } from '../models/Student';
import ClientAuth from '../models/ClientAuth';
import { AuthStatus } from '../models/BaseAuth';
import { AuthRequest } from '../middleware/auth';
import { ClientAuthRequest } from '../middleware/clientAuth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { validateStaff, validateLead, validatePackage } from '../utils/foreignKeys';
import { buildAuditLogData } from '../middleware/auditLogger';
import { sanitizeQueryParam, sanitizePaginationParams } from '../utils/validation';
import { CacheService, generateCacheKey, CacheNamespaces } from '../utils/cache';
import { classWindow, localCalendarDateAsUtc } from '../utils/dateTime';
import { ClientAuthService } from '../services/clientAuthService';
import { getCourseSessionTotal, isCourseLevel } from '../domain/courseEnrollment';

const invalidateStudentCaches = async (studentId: string): Promise<void> => {
  await Promise.all([
    CacheService.deletePattern(`${CacheNamespaces.STUDENT_LIST}:*`),
    CacheService.delete(generateCacheKey(CacheNamespaces.STUDENT_DETAILS, studentId)),
  ]);
};

export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { status, enrollmentStatus, course, page = '1', limit = '20' } = req.query;
    
    const filter: any = {};
    
    const sanitizedStatus = sanitizeQueryParam(status);
    const sanitizedEnrollmentStatus = sanitizeQueryParam(enrollmentStatus);
    const sanitizedCourse = sanitizeQueryParam(course);
    
    if (sanitizedStatus) filter.studentStatus = sanitizedStatus;
    if (sanitizedEnrollmentStatus) filter.enrollmentStatus = sanitizedEnrollmentStatus;
    if (sanitizedCourse) filter.course = sanitizedCourse;

    const { page: pageNum, limit: limitNum } = sanitizePaginationParams(page, limit);
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key based on filters and pagination
    const cacheKey = generateCacheKey(
      CacheNamespaces.STUDENT_LIST,
      `${sanitizedStatus}-${sanitizedEnrollmentStatus}-${sanitizedCourse}-${pageNum}-${limitNum}`
    );

    // Try to get from cache first
    const cached = await CacheService.get<{ data: any[]; pagination: any }>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached.data,
        pagination: cached.pagination,
        cached: true,
      });
    }

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('assignedStaff', 'name email')
        .populate('leadId', 'studentName parentName')
        .populate('currentPackageId', 'packageType courseLevel status remainingClasses completedClasses')
        .populate('packageHistory', 'packageType courseLevel status completedClasses')
        .select('studentName parentName email phoneNumber country course studentStatus enrollmentStatus assignedStaff leadId currentPackageId currentBatchId packageHistory notes timezone portalStatus frozenReason frozenAt createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Student.countDocuments(filter)
    ]);

    const result = {
      data: students,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    // Cache the result for 2 minutes (120 seconds)
    await CacheService.set(cacheKey, result, 120);

    res.json({
      success: true,
      ...result,
      cached: false,
    });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid filter parameter format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students due to server error',
    });
  }
};

export const getStudentById = async (req: AuthRequest, res: Response) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('assignedStaff', 'name email')
      .populate('leadId', 'studentName parentName')
      .populate(
        'currentPackageId',
        'packageType courseLevel status totalClasses completedClasses remainingClasses regularClassesCompleted enrollmentDate'
      )
      .populate('packageHistory', 'packageType courseLevel status completedClasses')
      .lean();
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error: any) {
    console.error('Error fetching student:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student due to server error',
    });
  }
};

export const createStudent = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    if (req.body.assignedStaff) {
      await validateStaff(req.body.assignedStaff);
    }
    if (req.body.leadId) {
      await validateLead(req.body.leadId);
    }
    if (req.body.currentPackageId) {
      await validatePackage(req.body.currentPackageId);
    }

    const student = await Student.create([{
      ...req.body,
      createdBy: req.user?.userId,
    }], { session });

    if (req.body.leadId) {
      const Lead = (await import('../models/Lead')).default;
      await Lead.findByIdAndUpdate(req.body.leadId, {
        convertedToStudent: true,
        studentId: student[0]._id,
        status: 'converted',
      }, { session });
    }

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.CREATE,
      entityType: AuditEntityType.STUDENT,
      entityId: student[0]._id,
      entityName: student[0].studentName,
      success: true,
    })], { session });

    await session.commitTransaction();

    // Invalidate student list cache
    await CacheService.deletePattern(`${CacheNamespaces.STUDENT_LIST}:*`);

    res.status(201).json({
      success: true,
      data: student[0],
      message: 'Student created successfully',
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error creating student:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }
    if (error.message?.includes('Staff not found')) {
      return res.status(400).json({
        success: false,
        error: 'Assigned staff member does not exist',
      });
    }
    if (error.message?.includes('Lead not found')) {
      return res.status(400).json({
        success: false,
        error: 'Lead does not exist',
      });
    }
    if (error.message?.includes('Package not found')) {
      return res.status(400).json({
        success: false,
        error: 'Package does not exist',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create student due to server error',
    });
  } finally {
    await session.endSession();
  }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let authIdToRevoke: string | null = null;

  try {
    if (req.body.assignedStaff) await validateStaff(req.body.assignedStaff);
    if (req.body.leadId) await validateLead(req.body.leadId);

    const student = await Student.findById(req.params.id).session(session);
    if (!student) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    const updates = { ...req.body };
    if (typeof updates.email === 'string') {
      updates.email = updates.email.trim().toLowerCase();
    }

    const emailChanged = typeof updates.email === 'string' && updates.email !== student.email;
    const statusChanged =
      typeof updates.studentStatus === 'string' && updates.studentStatus !== student.studentStatus;
    const clientAuth = await ClientAuth.findOne({ profileId: student._id }).session(session);

    if (emailChanged) {
      const conflictingAuth = await ClientAuth.findOne({
        email: updates.email,
        profileId: { $ne: student._id },
      }).session(session);

      if (conflictingAuth) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          error: 'That email is already used by another student portal account',
        });
      }
    }

    Object.assign(student, updates);
    if (emailChanged || statusChanged) {
      student.sessionVersion = (student.sessionVersion || 1) + 1;
    }
    await student.save({ session });

    if (clientAuth) {
      if (emailChanged) clientAuth.email = student.email;

      if (statusChanged && student.studentStatus !== StudentStatus.ACTIVE) {
        clientAuth.status = AuthStatus.INACTIVE;
      } else if (
        statusChanged &&
        student.studentStatus === StudentStatus.ACTIVE &&
        student.portalStatus !== PortalStatus.EXPIRED &&
        clientAuth.status === AuthStatus.INACTIVE
      ) {
        clientAuth.status = AuthStatus.ACTIVE;
      }

      if (clientAuth.isModified()) await clientAuth.save({ session });
      if (emailChanged || statusChanged) authIdToRevoke = clientAuth._id.toString();
    }

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.STUDENT,
      entityId: student._id,
      entityName: student.studentName,
      details: updates,
      success: true,
    })], { session });

    await session.commitTransaction();

    if (authIdToRevoke) {
      await ClientAuthService.revokeAllTokens(authIdToRevoke);
    }

    await invalidateStudentCaches(req.params.id);

    res.json({
      success: true,
      data: student,
      message: 'Student updated successfully',
    });
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('Error updating student:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A student or portal account with that email already exists',
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update student due to server error',
    });
  } finally {
    await session.endSession();
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    const [
      packageCount,
      paymentCount,
      attendanceCount,
      reportCount,
      classCount,
    ] = await Promise.all([
      (await import('../models/Package')).default.countDocuments({ student: student._id }),
      (await import('../models/Payment')).default.countDocuments({ student: student._id }),
      (await import('../models/Attendance')).default.countDocuments({ student: student._id }),
      (await import('../models/EvaluationReport')).default.countDocuments({ student: student._id }),
      (await import('../models/Class')).default.countDocuments({ students: student._id }),
    ]);
    const linkedRecords = packageCount + paymentCount + attendanceCount + reportCount + classCount;
    if (linkedRecords > 0) {
      return res.status(409).json({
        success: false,
        error: 'Students with academic or payment history cannot be deleted. Set the student status to inactive instead.',
      });
    }

    await ClientAuth.deleteMany({ profileId: student._id });
    await Student.findByIdAndDelete(student._id);

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.DELETE,
      entityType: AuditEntityType.STUDENT,
      entityId: student._id,
      entityName: student.studentName,
      success: true,
    }));

    // Invalidate student list cache and specific student cache
    await CacheService.deletePattern(`${CacheNamespaces.STUDENT_LIST}:*`);
    await CacheService.delete(generateCacheKey(CacheNamespaces.STUDENT_DETAILS, req.params.id));

    res.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting student:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete student due to server error',
    });
  }
};

export const getStudentStats = async (req: AuthRequest, res: Response) => {
  try {
    const total = await Student.countDocuments();
    const active = await Student.countDocuments({ studentStatus: StudentStatus.ACTIVE });
    const enrolled = await Student.countDocuments({ enrollmentStatus: EnrollmentStatus.ENROLLED });
    const byStatus = await Student.aggregate([
      { $group: { _id: '$studentStatus', count: { $sum: 1 } } },
    ]);
    const byCourse = await Student.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]);
    const newThisMonth = await Student.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) },
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        enrolled,
        byStatus,
        byCourse,
        newThisMonth,
      },
    });
  } catch (error: any) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student statistics due to server error',
    });
  }
};

export const provisionStudentAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const conflictingAuth = await ClientAuth.findOne({
      email: student.email.toLowerCase(),
      profileId: { $ne: student._id },
    });
    if (conflictingAuth) {
      return res.status(409).json({
        success: false,
        error: 'That email is already used by another student portal account',
      });
    }

    const desiredStatus =
      student.studentStatus === StudentStatus.ACTIVE && student.portalStatus !== PortalStatus.EXPIRED
        ? AuthStatus.ACTIVE
        : AuthStatus.INACTIVE;
    const existingAuth = await ClientAuth.findOne({ profileId: id });
    if (existingAuth) {
      existingAuth.email = student.email.toLowerCase();
      existingAuth.password = password;
      existingAuth.status = desiredStatus;
      await existingAuth.save();
      await Student.findByIdAndUpdate(id, { $inc: { sessionVersion: 1 } });
      await ClientAuthService.revokeAllTokens(existingAuth._id.toString());
      await invalidateStudentCaches(id);
      try {
        const emailService = (await import('../services/emailService')).default;
        await emailService.sendTemplatedEmail(student.email, 'student_credentials_updated', {
          parentName: student.parentName,
          studentName: student.studentName,
          email: existingAuth.email,
          tempPassword: password,
        });
      } catch (emailError) {
        console.error('Failed to send updated student credentials email:', emailError);
      }
      return res.json({
        success: true,
        message: 'Student portal credentials updated successfully.',
        data: { email: existingAuth.email, isNew: false },
      });
    }

    const newAuth = await ClientAuth.create({
      email: student.email,
      password,
      profileId: student._id,
      status: desiredStatus,
    });

    await invalidateStudentCaches(id);

    try {
      const emailService = (await import('../services/emailService')).default;
      await emailService.sendTemplatedEmail(student.email, 'credentials_created', {
        parentName: student.parentName,
        studentName: student.studentName,
        email: newAuth.email,
        tempPassword: password,
      });
    } catch (emailError) {
      console.error('Failed to send student credentials email:', emailError);
    }

    res.json({
      success: true,
      message: 'Student portal access created successfully.',
      data: { email: newAuth.email, isNew: true },
    });
  } catch (error: any) {
    console.error('Error provisioning student access:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A student portal account with that email already exists',
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to provision student access due to server error',
    });
  }
};

export const getStudentDashboard = async (req: ClientAuthRequest, res: Response) => {
  try {
    const studentProfileId = req.client?.profileId;
    
    if (!studentProfileId) {
      return res.status(401).json({
        success: false,
        error: 'Student profile ID not found in token',
      });
   }

    const student = await Student.findById(studentProfileId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Prefer the student's explicit package pointer. Fall back to the newest
    // active package for older records created before that pointer existed.
    const Package = (await import('../models/Package')).default;
    let currentPackage = student.currentPackageId
      ? await Package.findOne({
          _id: student.currentPackageId,
          student: studentProfileId,
          status: 'active',
        })
      : null;
    if (!currentPackage) {
      currentPackage = await Package.findOne({
        student: studentProfileId,
        status: 'active',
      }).sort({ createdAt: -1 });
    }

    const Batch = (await import('../models/Batch')).default;
    let currentBatch = student.currentBatchId
      ? await Batch.findById(student.currentBatchId)
          .select('name courseLevel status schedule timezone coach totalSessions sessionsCompleted')
          .populate('coach', 'name')
      : null;
    if (!currentBatch) {
      currentBatch = await Batch.findOne({
        students: studentProfileId,
        status: { $in: ['upcoming', 'ongoing'] },
      })
        .select('name courseLevel status schedule timezone coach totalSessions sessionsCompleted')
        .populate('coach', 'name')
        .sort({ createdAt: -1 });
    }

    const packageHistory = await Package.find({
      student: studentProfileId,
      ...(currentPackage ? { _id: { $ne: currentPackage._id } } : {}),
    })
      .select('packageType courseLevel status totalClasses completedClasses remainingClasses enrollmentDate createdAt')
      .sort({ createdAt: -1 });

    // Get upcoming classes
    const Class = (await import('../models/Class')).default;
    const today = localCalendarDateAsUtc(student.timezone);
    const upcomingClasses = await Class.find({
      students: studentProfileId,
      status: 'scheduled',
      date: { $gte: today },
    })
      .populate('coach', 'name email')
      .sort({ date: 1, startTime: 1 })
      .limit(5);

    // Get latest published evaluation report
    const EvaluationReport = (await import('../models/EvaluationReport')).default;
    const latestEvaluation = await EvaluationReport.findOne({
      student: studentProfileId,
      isPublished: true,
    })
      .populate('coach', 'name')
      .sort({ publishedAt: -1 });

    // Calculate attendance rate and get recent attendance history
    const Attendance = (await import('../models/Attendance')).default;
    const [totalClasses, attendedClasses] = await Promise.all([
      Attendance.countDocuments({
        student: studentProfileId,
        status: { $in: ['present', 'absent', 'disputed'] },
      }),
      Attendance.countDocuments({
        student: studentProfileId,
        status: 'present',
      }),
    ]);
    const attendanceRate = totalClasses > 0
      ? Math.min(100, Math.round((attendedClasses / totalClasses) * 100))
      : 0;

    // Get recent attendance history - exclude NOT_MARKED placeholders
    // (pre-created the moment a Class is scheduled, before any real
    // attendance event has happened) so they don't show up as fake history.
    const recentAttendance = await Attendance.find({
      student: studentProfileId,
      status: { $ne: 'not_marked' },
    })
      .populate('class', 'course date startTime endTime classNotes classNotesPostedAt')
      .populate('coach', 'name')
      .sort({ markedAt: -1 })
      .limit(10);

    // Check for pending activation - this means payment was confirmed
    // (manual verification done) but staff hasn't yet assigned a
    // coach/batch/schedule. A Package only exists AFTER activation, so the
    // correct signal is a PaymentLink still in WAITING_FOR_ACTIVATION, not
    // a Package status (which has no 'pending' value at all).
    const PaymentLink = (await import('../models/PaymentLink')).default;
    const { PaymentLinkStatus } = await import('../models/PaymentLink');
    const pendingActivation = await PaymentLink.findOne({
      student: studentProfileId,
      status: PaymentLinkStatus.WAITING_FOR_ACTIVATION,
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student._id.toString(),
          studentName: student.studentName,
          parentName: student.parentName,
          email: student.email,
          phoneNumber: student.phoneNumber,
          country: student.country,
          course: student.course,
          enrollmentStatus: student.enrollmentStatus,
          enrollmentDate: student.enrollmentDate,
          timezone: student.timezone,
          whatsappCommunityLink: student.whatsappCommunityLink,
          // Frozen/expired state - without this the frontend has no way to
          // know it should show "your portal is paused" / "please renew"
          // messaging instead of the normal dashboard.
          portalStatus: student.portalStatus,
          frozenReason: student.portalStatus === PortalStatus.FROZEN ? student.frozenReason : undefined,
          frozenAt: student.portalStatus === PortalStatus.FROZEN ? student.frozenAt : undefined,
        },
        currentPackage: currentPackage ? {
          _id: currentPackage._id.toString(),
          packageType: currentPackage.packageType,
          courseLevel: currentPackage.courseLevel,
          status: currentPackage.status,
          totalClasses: currentPackage.totalClasses,
          completedClasses: currentPackage.completedClasses,
          remainingClasses: currentPackage.remainingClasses,
          regularClassesCompleted: currentPackage.regularClassesCompleted || 0,
        } : null,
        currentBatch: currentBatch ? {
          _id: currentBatch._id.toString(),
          name: currentBatch.name,
          courseLevel: currentBatch.courseLevel,
          status: currentBatch.status,
          totalSessions:
            currentBatch.totalSessions ||
            (isCourseLevel(currentBatch.courseLevel) ? getCourseSessionTotal(currentBatch.courseLevel) : 0),
          sessionsCompleted: currentBatch.sessionsCompleted || 0,
          schedule: currentBatch.schedule,
          timezone: currentBatch.timezone,
          coach:
            currentBatch.coach && typeof currentBatch.coach === 'object' && 'name' in currentBatch.coach
              ? { name: (currentBatch.coach as any).name }
              : undefined,
        } : null,
        packageHistory: packageHistory.map((packageItem) => ({
          _id: packageItem._id.toString(),
          packageType: packageItem.packageType,
          courseLevel: packageItem.courseLevel,
          status: packageItem.status,
          totalClasses: packageItem.totalClasses,
          completedClasses: packageItem.completedClasses,
          remainingClasses: packageItem.remainingClasses,
          enrollmentDate: packageItem.enrollmentDate,
        })),
        // Return a strict student-facing DTO. In particular, do not leak the
        // complete class roster, internal fields, or a meeting link while the
        // student's portal is paused.
        upcomingClasses: upcomingClasses.map((classItem: any) => {
          const { startAt, endAt } = classWindow(classItem);
          return {
            _id: classItem._id.toString(),
            course: classItem.course,
            classType: classItem.classType,
            date: classItem.date,
            startTime: classItem.startTime,
            endTime: classItem.endTime,
            timezone: classItem.timezone,
            hasMeetingLink:
              student.portalStatus === PortalStatus.ACTIVE && Boolean(classItem.meetingLink),
            joinOpensAt: startAt.toISOString(),
            joinClosesAt: endAt.toISOString(),
            coach: classItem.coach
              ? { name: classItem.coach.name, email: classItem.coach.email }
              : undefined,
          };
        }),
        recentAttendance: recentAttendance.map((attendanceItem: any) => ({
          _id: attendanceItem._id.toString(),
          status: attendanceItem.status,
          markedAt: attendanceItem.markedAt,
          disputeReason: attendanceItem.disputeReason,
          class: attendanceItem.class
            ? {
                course: attendanceItem.class.course,
                date: attendanceItem.class.date,
                startTime: attendanceItem.class.startTime,
                endTime: attendanceItem.class.endTime,
                classNotes: attendanceItem.class.classNotes,
                classNotesPostedAt: attendanceItem.class.classNotesPostedAt,
              }
            : undefined,
        })),
        latestEvaluation,
        attendanceRate,
        pendingActivation: !!pendingActivation,
      },
    });
  } catch (error: any) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data due to server error',
    });
  }
};

/**
 * Staff/Admin pauses a student's portal - package countdown halts and they
 * are excluded from new class generation for their batch (see createClass
 * in classController.ts) until unfrozen. Their account, login, and history
 * remain fully intact; this is a pause, not a suspension.
 */
export const freezeStudentPortal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (student.portalStatus === PortalStatus.FROZEN) {
      return res.status(400).json({
        success: false,
        error: 'Student portal is already frozen',
      });
    }
    if (student.portalStatus === PortalStatus.EXPIRED) {
      return res.status(400).json({
        success: false,
        error: 'Cannot freeze an already-expired portal. Please renew/reactivate the student first.',
      });
    }

    const previousStatus = student.portalStatus;

    student.portalStatus = PortalStatus.FROZEN;
    student.frozenAt = new Date();
    student.frozenBy = req.user?.userId as any;
    student.frozenReason = reason;
    // Clear any stale unfreeze metadata from a previous freeze cycle
    student.unfrozenAt = undefined;
    student.unfrozenBy = undefined;
    await student.save();
    await invalidateStudentCaches(id);

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.PORTAL_FROZEN,
      entityType: AuditEntityType.STUDENT,
      entityId: student._id,
      entityName: `Portal frozen for ${student.studentName}`,
      details: { reason, previousStatus },
      success: true,
    }));

    try {
      const emailService = (await import('../services/emailService')).default;
      await emailService.sendTemplatedEmail(student.email, 'portal_frozen', {
        parentName: student.parentName,
        studentName: student.studentName,
        reason,
      });
    } catch (emailError) {
      console.error('Failed to send portal-frozen email:', emailError);
    }

    res.json({
      success: true,
      data: student,
      message: 'Student portal paused successfully',
    });
  } catch (error: any) {
    console.error('Error freezing student portal:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to freeze student portal due to server error',
    });
  }
};

/**
 * Resumes a frozen student's portal. Package countdown resumes and they
 * become eligible for new class generation again starting from the next
 * batch class scheduled after this point - already-scheduled classes
 * during the freeze window (if any were created before freezing) are
 * untouched.
 */
export const unfreezeStudentPortal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (student.portalStatus !== PortalStatus.FROZEN) {
      return res.status(400).json({
        success: false,
        error: `Cannot unfreeze - portal is currently ${student.portalStatus}, not frozen`,
      });
    }

    student.portalStatus = PortalStatus.ACTIVE;
    student.unfrozenAt = new Date();
    student.unfrozenBy = req.user?.userId as any;
    await student.save();
    await invalidateStudentCaches(id);

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.PORTAL_UNFROZEN,
      entityType: AuditEntityType.STUDENT,
      entityId: student._id,
      entityName: `Portal unfrozen for ${student.studentName}`,
      details: { previousFrozenReason: student.frozenReason, frozenSince: student.frozenAt },
      success: true,
    }));

    try {
      const emailService = (await import('../services/emailService')).default;
      await emailService.sendTemplatedEmail(student.email, 'portal_unfrozen', {
        parentName: student.parentName,
        studentName: student.studentName,
      });
    } catch (emailError) {
      console.error('Failed to send portal-unfrozen email:', emailError);
    }

    res.json({
      success: true,
      data: student,
      message: 'Student portal resumed successfully',
    });
  } catch (error: any) {
    console.error('Error unfreezing student portal:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to unfreeze student portal due to server error',
    });
  }
};

export const submitHelpRequest = async (req: ClientAuthRequest, res: Response) => {
  try {
    const { name, subject, topic, message } = req.body;

    if (!name || !subject || !topic || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name, subject, topic, and message are required',
      });
    }

    const client = await ClientAuth.findById(req.client?.authId);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const student = await Student.findById(client.profileId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const emailService = (await import('../services/emailService')).default;
    await emailService.sendTemplatedEmail('support@emberkidschess.com', 'help_request', {
      studentName: name,
      fromEmail: student.email,
      subject,
      topic,
      message,
      submittedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Your help request has been submitted. We will get back to you soon.',
    });
  } catch (error: any) {
    console.error('Error submitting help request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit help request',
    });
  }
};
