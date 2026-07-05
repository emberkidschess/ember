import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Class, { ClassStatus } from '../models/Class';
import Attendance, { AttendanceStatus } from '../models/Attendance';
import { AuthRequest } from '../middleware/auth';
import { ClientAuthRequest } from '../middleware/clientAuth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { validateStudent, validateStaff, validateBatch } from '../utils/foreignKeys';
import { notifyClassScheduled, notifyClassRescheduled, notifyClassCancelled } from '../utils/classNotifications';
import { buildAuditLogData } from '../middleware/auditLogger';
import { sanitizeQueryParam, sanitizePaginationParams } from '../utils/validation';
import { reversePackageConsumption } from './attendanceController';
import { classWindow, SUPPORTED_TIMEZONES } from '../utils/dateTime';
import { ensureBatchSessionPlan } from '../domain/courseEnrollment';

const TRIAL_RESULT_EARLY_GRACE_MINUTES = 10;
const TRIAL_EXPIRY_DAYS = 14;

type TrialResult =
  | 'recommended'
  | 'not_recommended'
  | 'needs_follow_up'
  | 'reschedule_requested'
  | 'expired'
  | 'pending';

function windowsOverlap(
  left: { startAt: Date; endAt: Date },
  right: { startAt: Date; endAt: Date }
): boolean {
  return left.startAt < right.endAt && right.startAt < left.endAt;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function findCoachConflict(
  coach: mongoose.Types.ObjectId | string,
  targetWindow: { startAt: Date; endAt: Date },
  excludeClassId?: mongoose.Types.ObjectId | string,
  session?: mongoose.ClientSession
) {
  const rangeStart = new Date(targetWindow.startAt.getTime() - 48 * 60 * 60 * 1000);
  const rangeEnd = new Date(targetWindow.endAt.getTime() + 48 * 60 * 60 * 1000);
  const query: any = {
    coach,
    status: { $in: [ClassStatus.SCHEDULED, ClassStatus.COMPLETED] },
    date: { $gte: rangeStart, $lte: rangeEnd },
  };
  if (excludeClassId) query._id = { $ne: excludeClassId };

  const candidates = await Class.find(query).session(session || null);
  return candidates.find((item) => windowsOverlap(classWindow(item), targetWindow));
}

async function assertLeadHasNoActiveTrial(
  leadId: mongoose.Types.ObjectId | string,
  session?: mongoose.ClientSession,
  excludeClassId?: mongoose.Types.ObjectId | string
) {
  const query: any = {
    leadId,
    classType: 'trial',
    status: ClassStatus.SCHEDULED,
    trialResult: 'pending',
  };
  if (excludeClassId) query._id = { $ne: excludeClassId };

  const activeTrials = await Class.find(query).session(session || null);
  const now = new Date();
  const activeTrial = activeTrials.find((trial) => {
    const { endAt } = classWindow(trial);
    const expiresAt = trial.trialExpiresAt || addDays(endAt, TRIAL_EXPIRY_DAYS);
    return expiresAt > now;
  });

  if (activeTrial) {
    throw new Error('This lead already has an active pending trial class. Reschedule or cancel it before booking another trial.');
  }
}

async function getNextTrialAttemptNumber(leadId: mongoose.Types.ObjectId | string, session?: mongoose.ClientSession) {
  const previousAttempts = await Class.countDocuments({ leadId, classType: 'trial' }).session(session || null);
  return previousAttempts + 1;
}

async function expireStaleTrials(now = new Date()) {
  const pendingTrials = await Class.find({
    classType: 'trial',
    status: ClassStatus.SCHEDULED,
    trialResult: 'pending',
  });
  const staleTrials = pendingTrials.filter((trial) => {
    const { endAt } = classWindow(trial);
    const expiresAt = trial.trialExpiresAt || addDays(endAt, TRIAL_EXPIRY_DAYS);
    return expiresAt <= now;
  });
  if (!staleTrials.length) return;

  const Lead = (await import('../models/Lead')).default;
  const { LeadStatus } = await import('../models/Lead');
  await Promise.all(staleTrials.map(async (trial) => {
    trial.trialResult = 'expired';
    trial.trialAttendanceStatus = trial.trialJoinedAt ? 'attended' : 'no_show';
    trial.status = ClassStatus.MISSED;
    trial.trialExpiresAt = trial.trialExpiresAt || addDays(classWindow(trial).endAt, TRIAL_EXPIRY_DAYS);
    await trial.save();
    if (trial.leadId) {
      await Lead.updateOne(
        { _id: trial.leadId, status: LeadStatus.TRIAL_SCHEDULED },
        { $set: { status: LeadStatus.FOLLOW_UP } }
      );
    }
  }));
}

function normalizeTrialResultForLead(trialResult: TrialResult) {
  if (trialResult === 'recommended') return 'ready_to_join';
  if (trialResult === 'not_recommended') return 'not_ready';
  return 'follow_up';
}

export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const { status, coach, student, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
    
    const filter: any = {};
    
    const sanitizedStatus = sanitizeQueryParam(status);
    const sanitizedCoach = sanitizeQueryParam(coach);
    const sanitizedStudent = sanitizeQueryParam(student);
    
    if (sanitizedStatus) filter.status = sanitizedStatus;
    if (sanitizedCoach) filter.coach = sanitizedCoach;
    if (sanitizedStudent) filter.students = sanitizedStudent;
    
    const sanitizedDateFrom = sanitizeQueryParam(dateFrom);
    const sanitizedDateTo = sanitizeQueryParam(dateTo);
    
    if (sanitizedDateFrom || sanitizedDateTo) {
      filter.date = {};
      if (sanitizedDateFrom) filter.date.$gte = new Date(sanitizedDateFrom);
      if (sanitizedDateTo) filter.date.$lte = new Date(sanitizedDateTo);
    }

    const { page: pageNum, limit: limitNum } = sanitizePaginationParams(page, limit);
    const skip = (pageNum - 1) * limitNum;

    const [classes, total] = await Promise.all([
      Class.find(filter)
        .populate('students', 'studentName parentName email phone')
        .populate('coach', 'name email')
        .populate('createdBy', 'name email')
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limitNum),
      Class.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: classes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching classes:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid filter parameter format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch classes due to server error',
    });
  }
};

export const getClassById = async (req: AuthRequest, res: Response) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('students', 'studentName parentName email phone')
      .populate('coach', 'name email')
      .populate('createdBy', 'name email');
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
      });
    }

    res.json({
      success: true,
      data: classData,
    });
  } catch (error: any) {
    console.error('Error fetching class:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class due to server error',
    });
  }
};

export const createClass = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    let studentIds: string[] = Array.isArray(req.body.students) ? req.body.students : [];
    let batchSessionNumber: number | undefined;

    if (req.body.batch) {
      await validateBatch(req.body.batch);
      const Batch = (await import('../models/Batch')).default;
      const batchDoc = await Batch.findById(req.body.batch).session(session);
      if (!batchDoc) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }
      if ((req.body.classType || 'regular') !== 'regular') {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'Batch sessions can only be regular course sessions.',
        });
      }
      ensureBatchSessionPlan(batchDoc);
      await batchDoc.save({ session });
      const nextSession = batchDoc.sessions.find((item) => item.status === 'planned');
      if (!nextSession) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          error: `All ${batchDoc.totalSessions} sessions for this batch are already scheduled.`,
        });
      }
      batchSessionNumber = nextSession.sessionNumber;
      const batchStudentIds = batchDoc.students.map((id) => id.toString());

      // Frozen students are excluded from new class generation - their
      // historical batch membership (Batch.students) and past attendance
      // are left intact, but they won't be scheduled into upcoming
      // sessions while paused. This is the actual mechanism behind
      // "temporarily removing them from the active batch": Batch.students
      // itself is never mutated, since doing so would orphan historical
      // attendance linkage and be harder to reverse cleanly on unfreeze.
      const Student = (await import('../models/Student')).default;
      const frozenOrExpired = await Student.find({
        _id: { $in: batchStudentIds },
        portalStatus: { $in: ['frozen', 'expired'] },
      }).select('_id').session(session);
      const excludedIds = new Set(frozenOrExpired.map((s) => s._id.toString()));
      const activeBatchStudentIds = batchStudentIds.filter((id) => !excludedIds.has(id));

      studentIds = Array.from(new Set([...studentIds, ...activeBatchStudentIds]));
      if (!req.body.coach) req.body.coach = batchDoc.coach.toString();
      if (!req.body.course) req.body.course = batchDoc.courseLevel;
    }

    if (studentIds.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'At least one student must be assigned to the class',
      });
    }

    await Promise.all(studentIds.map((id) => validateStudent(id)));
    await validateStaff(req.body.coach);

    const { coach, date, startTime, endTime } = req.body;
    
    // Check coach conflict
    const conflictCheck = await Class.findOne({
      coach,
      date: new Date(date),
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      ],
      status: { $in: [ClassStatus.SCHEDULED, ClassStatus.COMPLETED] },
    }).session(session);

    if (conflictCheck) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Scheduling conflict: Coach already has a class at this time',
      });
    }

    // Check student conflicts
    const studentConflictCheck = await Class.findOne({
      students: { $in: studentIds },
      date: new Date(date),
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
      status: { $in: [ClassStatus.SCHEDULED, ClassStatus.COMPLETED] },
    }).session(session);

    if (studentConflictCheck) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'One or more students are already booked in another class at this time',
      });
    }

    // Validate each student has active package
    const Package = (await import('../models/Package')).default;
    for (const studentId of studentIds) {
      const activePackage = await Package.findOne({
        student: studentId,
        status: 'active',
        remainingClasses: { $gt: 0 },
        ...(req.body.batch
          ? {
              courseLevel:
                req.body.course === 'Expert'
                  ? { $in: ['Expert', 'Master'] }
                  : req.body.course,
            }
          : {}),
      }).session(session);
      
      if (!activePackage) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: `Student does not have an active package`,
        });
      }
    }

    if (!req.body.classType) {
      req.body.classType = 'regular';
    }

    if (!req.body.timezone) {
      const Student = (await import('../models/Student')).default;
      const firstStudent = await Student.findById(studentIds[0]).session(session);
      req.body.timezone = firstStudent?.timezone || 'America/New_York';
    }

    // Validate timezone against IANA timezone database
    // Using the same list as defined in Student model for consistency
    if (!SUPPORTED_TIMEZONES.includes(req.body.timezone)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: `Invalid timezone. Valid timezones are: ${SUPPORTED_TIMEZONES.join(', ')}`,
      });
    }

    const classData = await Class.create([{
      ...req.body,
      students: studentIds,
      sessionNumber: batchSessionNumber,
      createdBy: req.user?.userId,
    }], { session });

    if (req.body.batch && batchSessionNumber) {
      const Batch = (await import('../models/Batch')).default;
      await Batch.updateOne(
        {
          _id: req.body.batch,
          sessions: {
            $elemMatch: {
              sessionNumber: batchSessionNumber,
              status: 'planned',
            },
          },
        },
        {
          $set: {
            'sessions.$.status': 'scheduled',
            'sessions.$.classId': classData[0]._id,
          },
        },
        { session }
      );
    }

    // Pre-create a NOT_MARKED attendance placeholder for every enrolled
    // student. Click-tracking ("Join Now"), the auto-absent cron, and the
    // dispute/override flow all operate on an existing record - without
    // this, there is nothing for a student's click to attach to.
    await Attendance.insertMany(
      studentIds.map((studentId) => ({
        class: classData[0]._id,
        student: studentId,
        coach: req.body.coach,
        status: AttendanceStatus.NOT_MARKED,
        attendanceConsumed: false,
      })),
      { session }
    );

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.CREATE,
      entityType: AuditEntityType.CLASS,
      entityId: classData[0]._id,
      entityName: `Class for ${req.body.course}`,
      success: true,
    })], { session });

    await session.commitTransaction();

    try {
      await notifyClassScheduled(classData[0]._id.toString(), studentIds);
    } catch (notifyError) {
      console.error('Failed to send class-scheduled notifications:', notifyError);
    }

    res.status(201).json({
      success: true,
      data: classData[0],
      message: 'Class scheduled successfully',
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error creating class:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }
    if (error.message?.includes('Staff not found')) {
      return res.status(400).json({
        success: false,
        error: 'Assigned coach does not exist',
      });
    }
    if (error.message?.includes('Student not found')) {
      return res.status(400).json({
        success: false,
        error: 'One or more students do not exist',
      });
    }
    if (error.message?.includes('Batch not found')) {
      return res.status(400).json({
        success: false,
        error: 'Batch does not exist',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to schedule class due to server error',
    });
  } finally {
    await session.endSession();
  }
};

export const rescheduleClass = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';
    const { date, startTime, endTime } = req.body;

    const existingClass = await Class.findById(req.params.id);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
      });
    }

    const previous = {
      date: existingClass.date,
      startTime: existingClass.startTime,
      endTime: existingClass.endTime,
    };

    if (date) {
      const conflictCheck = await Class.findOne({
        _id: { $ne: existingClass._id },
        coach: existingClass.coach,
        date: new Date(date),
        $or: [{ startTime: { $lt: endTime || existingClass.endTime }, endTime: { $gt: startTime || existingClass.startTime } }],
        status: { $in: [ClassStatus.SCHEDULED, ClassStatus.COMPLETED] },
      });

      if (conflictCheck) {
        return res.status(400).json({
          success: false,
          error: 'Scheduling conflict: Coach already has a class at this time',
        });
      }
    }

    existingClass.date = date ? new Date(date) : existingClass.date;
    existingClass.startTime = startTime || existingClass.startTime;
    existingClass.endTime = endTime || existingClass.endTime;
    existingClass.status = ClassStatus.SCHEDULED;
    existingClass.rescheduledFrom = previous;
    await existingClass.save();

    // Reset NOT_MARKED/ABSENT placeholders to NOT_MARKED for the new time -
    // a stale "absent" from the old slot's cron run is meaningless once the
    // class has moved. Records that already consumed a package credit
    // (PRESENT, or a DISPUTED record approved before the reschedule) are
    // left untouched here - reversing a financial transaction belongs to
    // the explicit override/dispute path, not an implicit reschedule
    // side-effect, so staff must use overrideAttendance if that's needed.
    await Attendance.updateMany(
      {
        class: existingClass._id,
        status: { $in: [AttendanceStatus.NOT_MARKED, AttendanceStatus.ABSENT] },
        attendanceConsumed: false,
      },
      { $set: { status: AttendanceStatus.NOT_MARKED }, $unset: { source: 1, markedAt: 1, joinClickedAt: 1 } }
    );

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.CLASS,
      entityId: existingClass._id,
      entityName: `Class for ${existingClass.course}`,
      details: { previous, new: { date, startTime, endTime } },
      success: true,
    }));

    try {
      await notifyClassRescheduled(
        existingClass._id.toString(),
        existingClass.students.map((s) => s.toString()),
        `Rescheduled from ${previous.date.toDateString()} ${previous.startTime}-${previous.endTime}`
      );
    } catch (notifyError) {
      console.error('Failed to send class-rescheduled notifications:', notifyError);
    }

    res.json({
      success: true,
      data: existingClass,
      message: 'Class rescheduled successfully',
    });
  } catch (error: any) {
    console.error('Error rescheduling class:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to reschedule class due to server error',
    });
  }
};

export const cancelClass = async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;

    const existingClass = await Class.findById(req.params.id);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
      });
    }

    const studentIds = existingClass.students.map((s) => s.toString());

    existingClass.status = ClassStatus.CANCELLED;
    existingClass.cancellationReason = reason;
    await existingClass.save();

    if (existingClass.classType === 'trial' && existingClass.leadId) {
      const Lead = (await import('../models/Lead')).default;
      const { LeadStatus } = await import('../models/Lead');
      await Lead.updateOne(
        { _id: existingClass.leadId, status: LeadStatus.TRIAL_SCHEDULED },
        { $set: { status: LeadStatus.FOLLOW_UP } }
      );
    }

    if (existingClass.batch && existingClass.sessionNumber && !existingClass.batchProgressCounted) {
      const Batch = (await import('../models/Batch')).default;
      await Batch.updateOne(
        {
          _id: existingClass.batch,
          sessions: {
            $elemMatch: {
              sessionNumber: existingClass.sessionNumber,
              classId: existingClass._id,
              status: 'scheduled',
            },
          },
        },
        {
          $set: { 'sessions.$.status': 'planned' },
          $unset: { 'sessions.$.classId': '' },
        }
      );
    }

    // A cancelled class never happened - delete any still-pending NOT_MARKED
    // placeholders rather than mislabeling them ABSENT, which would
    // incorrectly count against the student's attendance rate. Records that
    // already consumed a package credit (rare: cancelling after some
    // students had already joined) are left untouched - that's explicit
    // override territory, not an implicit cancellation side-effect.
    await Attendance.deleteMany({ class: existingClass._id, status: AttendanceStatus.NOT_MARKED });

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.CLASS,
      entityId: existingClass._id,
      entityName: `Class for ${existingClass.course}`,
      details: { status: 'cancelled', reason },
      success: true,
    }));

    try {
      await notifyClassCancelled(existingClass._id.toString(), studentIds, reason);
    } catch (notifyError) {
      console.error('Failed to send class-cancelled notifications:', notifyError);
    }

    res.json({
      success: true,
      data: existingClass,
      message: 'Class cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling class:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to cancel class due to server error',
    });
  }
};

export const updateClass = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    if (req.body.recordingLink || req.body.recordingFile) {
      req.body.recordingUploadedAt = new Date();
      req.body.recordingUploadedBy = req.user?.userId;
    }

    const classData = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
      });
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.CLASS,
      entityId: classData._id,
      entityName: `Class for ${classData.course}`,
      details: req.body,
      success: true,
    }));

    res.json({
      success: true,
      data: classData,
      message: 'Class updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating class:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update class due to server error',
    });
  }
};

/**
 * Class Notes Hub: after a class session ends, the coach posts homework/
 * notes which instantly appear on every enrolled student's dashboard (via
 * the same Class document they already read through getMyClasses - no
 * separate broadcast mechanism needed).
 */
export const postClassNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { classNotes } = req.body;

    const classData = await Class.findByIdAndUpdate(
      req.params.id,
      { classNotes, classNotesPostedAt: new Date() },
      { new: true }
    );

    if (!classData) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.CLASS,
      entityId: classData._id,
      entityName: `Class notes posted for ${classData.course}`,
      success: true,
    }));

    res.json({
      success: true,
      data: classData,
      message: 'Notes posted - now visible on student dashboards',
    });
  } catch (error: any) {
    console.error('Error posting class notes:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to post class notes due to server error',
    });
  }
};

export const deleteClass = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingClass = await Class.findById(req.params.id).session(session);
    if (!existingClass) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Class not found',
      });
    }

    // Reverse package consumption for any attendance row that had already
    // consumed a credit (PRESENT, or an approved dispute) before hard-
    // deleting - otherwise the Package's completed/remaining counts would
    // silently drift from reality with no record left to explain why.
    const consumedAttendance = await Attendance.find({
      class: existingClass._id,
      attendanceConsumed: true,
    }).session(session);

    for (const record of consumedAttendance) {
      await reversePackageConsumption(record.student, existingClass._id, session);
    }

    await Attendance.deleteMany({ class: existingClass._id }).session(session);
    await Class.findByIdAndDelete(req.params.id).session(session);

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.DELETE,
      entityType: AuditEntityType.CLASS,
      entityId: existingClass._id,
      entityName: `Class for ${existingClass.course}`,
      details: { reversedAttendanceCount: consumedAttendance.length },
      success: true,
    })], { session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error deleting class:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete class due to server error',
    });
  } finally {
    await session.endSession();
  }
};

export const getClassStats = async (req: AuthRequest, res: Response) => {
  try {
    const total = await Class.countDocuments();
    const scheduled = await Class.countDocuments({ status: ClassStatus.SCHEDULED });
    const completed = await Class.countDocuments({ status: ClassStatus.COMPLETED });
    const missed = await Class.countDocuments({ status: ClassStatus.MISSED });
    const cancelled = await Class.countDocuments({ status: ClassStatus.CANCELLED });
    const upcoming = await Class.countDocuments({
      status: ClassStatus.SCHEDULED,
      date: { $gte: new Date() },
    });

    res.json({
      success: true,
      data: {
        total,
        scheduled,
        completed,
        missed,
        cancelled,
        upcoming,
      },
    });
  } catch (error: any) {
    console.error('Error fetching class stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class statistics due to server error',
    });
  }
};

export const getMyClasses = async (req: ClientAuthRequest, res: Response) => {
  try {
    const studentProfileId = req.client?.profileId;
    
    if (!studentProfileId) {
      return res.status(401).json({
        success: false,
        error: 'Student profile ID not found in token',
      });
    }

    const Student = (await import('../models/Student')).default;
    const student = await Student.findById(studentProfileId).select('portalStatus');
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const classes = await Class.find({ students: studentProfileId })
      .populate('coach', 'name email')
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      // Student-facing DTO: do not expose the other students in the class,
      // internal scheduling fields, or meeting access while paused.
      data: classes.map((classItem: any) => {
        const { startAt, endAt } = classWindow(classItem);
        return {
          _id: classItem._id.toString(),
          course: classItem.course,
          classType: classItem.classType,
          date: classItem.date,
          startTime: classItem.startTime,
          endTime: classItem.endTime,
          timezone: classItem.timezone,
          status: classItem.status,
          classNotes: classItem.classNotes,
          classNotesPostedAt: classItem.classNotesPostedAt,
          hasMeetingLink:
            student.portalStatus === 'active' && Boolean(classItem.meetingLink),
          joinOpensAt: startAt.toISOString(),
          joinClosesAt: endAt.toISOString(),
          coach: classItem.coach
            ? { name: classItem.coach.name, email: classItem.coach.email }
            : undefined,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching student classes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your classes due to server error',
    });
  }
};

export const scheduleTrialClass = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';
    const { leadId, coach, date, startTime, endTime, timezone, meetingLink } = req.body;

    // Validate leadId is provided
    if (!leadId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'leadId is required',
      });
    }

    const Staff = (await import('../models/Staff')).default;
    const { StaffRole, StaffStatus } = await import('../models/Staff');
    const coachProfile = await Staff.findOne({
      _id: coach,
      role: StaffRole.COACH,
      status: StaffStatus.ACTIVE,
    }).session(session);
    if (!coachProfile) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Assigned coach must be an active coach',
      });
    }

    // Get lead information
    const Lead = (await import('../models/Lead')).default;
    const { LeadStatus } = await import('../models/Lead');
    const lead = await Lead.findById(leadId).session(session);
    if (!lead) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    if (lead.convertedToStudent || lead.status === LeadStatus.CONVERTED || lead.status === LeadStatus.LOST) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'A converted or closed lead cannot be scheduled for a trial',
      });
    }
    await assertLeadHasNoActiveTrial(lead._id, session);

    const trialWindow = classWindow({
      date,
      startTime,
      endTime,
      timezone: timezone || 'America/New_York',
    });
    if (trialWindow.endAt <= trialWindow.startAt) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'End time must be after start time' });
    }
    if (trialWindow.endAt <= new Date()) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'Trial class must be scheduled in the future' });
    }

    // Check coach availability using actual UTC windows, not local time
    // strings. This catches 3PM IST vs 3PM EST style conflicts correctly.
    const conflictCheck = await findCoachConflict(coach, trialWindow, undefined, session);

    if (conflictCheck) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Coach already has a class at this time',
      });
    }

    const trialAttemptNumber = await getNextTrialAttemptNumber(lead._id, session);

    // Create trial class
    const trialClass = await Class.create([{
      students: [], // Trial students don't have student records yet
      coach,
      course: 'Chess Trial',
      date: new Date(date),
      startTime,
      endTime,
      timezone: timezone || 'America/New_York',
      meetingLink,
      classType: 'trial',
      leadId: lead._id,
      trialResult: 'pending',
      trialAttendanceStatus: 'not_marked',
      trialAttemptNumber,
      trialExpiresAt: addDays(trialWindow.endAt, TRIAL_EXPIRY_DAYS),
      createdBy: req.user?.userId,
    }], { session });

    // Update lead status to trial scheduled
    await Lead.findByIdAndUpdate(lead._id, {
      status: LeadStatus.TRIAL_SCHEDULED,
      assignedTo: coach
    }, { session });

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.CREATE,
      entityType: AuditEntityType.CLASS,
      entityId: trialClass[0]._id,
      entityName: `Trial class for ${lead.studentName}`,
      success: true,
    })], { session });

    await session.commitTransaction();

    // Send email to student/parent
    try {
      const emailService = (await import('../services/emailService')).default;
      await emailService.sendTemplatedEmail(lead.email, 'trial_scheduled', {
        parentName: lead.parentName,
        studentName: lead.studentName,
        date: new Date(date).toLocaleDateString(),
        startTime,
        endTime,
        meetingLink,
        timezone: timezone || 'America/New_York',
      });
    } catch (emailError) {
      console.error('Failed to send trial scheduled email:', emailError);
    }

    // Send notification to coach
    try {
      const Notification = (await import('../models/Notification')).default;
      const Staff = (await import('../models/Staff')).default;
      const coachData = await Staff.findById(coach);
      if (coachData) {
        await Notification.create({
          recipient: coachData._id,
          recipientType: 'Staff',
          type: 'trial_scheduled',
          channel: 'email',
          status: 'pending',
          content: {
            subject: 'New Trial Class Scheduled',
            body: `Trial class for ${lead.studentName} scheduled on ${new Date(date).toLocaleDateString()} at ${startTime}`,
            data: {
              classId: trialClass[0]._id,
              studentName: lead.studentName,
              date,
              startTime,
              meetingLink,
            },
          },
        });
      }
    } catch (notifyError) {
      console.error('Failed to create coach notification:', notifyError);
    }

    res.status(201).json({
      success: true,
      data: trialClass[0],
      message: 'Trial class scheduled successfully',
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error scheduling trial class:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }
    if (error.message?.includes('Staff not found')) {
      return res.status(400).json({
        success: false,
        error: 'Assigned coach does not exist',
      });
    }
    if (error.message?.includes('Lead not found')) {
      return res.status(400).json({
        success: false,
        error: 'Lead does not exist',
      });
    }
    if (error.message?.includes('active pending trial')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to schedule trial class due to server error',
    });
  } finally {
    await session.endSession();
  }
};

export const rescheduleTrialClass = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { date, startTime, endTime, timezone, meetingLink } = req.body;
    const classData = await Class.findById(req.params.id).session(session);
    if (!classData || classData.classType !== 'trial') {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Trial class not found' });
    }
    if (classData.status === ClassStatus.CANCELLED) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'Cancelled trial classes cannot be rescheduled' });
    }
    if (!classData.leadId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'Trial class is missing its lead record' });
    }

    const trialTimezone = timezone || classData.timezone || 'America/New_York';
    const trialWindow = classWindow({ date, startTime, endTime, timezone: trialTimezone });
    if (trialWindow.endAt <= trialWindow.startAt) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'End time must be after start time' });
    }
    if (trialWindow.endAt <= new Date()) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'Trial class must be rescheduled in the future' });
    }

    await assertLeadHasNoActiveTrial(classData.leadId, session, classData._id);
    const conflictCheck = await findCoachConflict(classData.coach, trialWindow, classData._id, session);
    if (conflictCheck) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Coach already has a class at this time',
      });
    }

    const previous = {
      date: classData.date,
      startTime: classData.startTime,
      endTime: classData.endTime,
    };

    classData.date = new Date(date);
    classData.startTime = startTime;
    classData.endTime = endTime;
    classData.timezone = trialTimezone;
    classData.meetingLink = meetingLink;
    classData.status = ClassStatus.SCHEDULED;
    classData.trialResult = 'pending';
    classData.trialResultNotes = undefined;
    classData.trialResultMarkedAt = undefined;
    classData.trialResultMarkedBy = undefined;
    classData.trialJoinedAt = undefined;
    classData.trialAttendanceStatus = 'not_marked';
    classData.trialReminderSentAt = undefined;
    classData.trialExpiresAt = addDays(trialWindow.endAt, TRIAL_EXPIRY_DAYS);
    classData.rescheduledFrom = previous;
    await classData.save({ session });

    const Lead = (await import('../models/Lead')).default;
    const { LeadStatus } = await import('../models/Lead');
    await Lead.findByIdAndUpdate(
      classData.leadId,
      { status: LeadStatus.TRIAL_SCHEDULED, assignedTo: classData.coach },
      { session }
    );

    await AuditLog.create([buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.CLASS,
      entityId: classData._id,
      entityName: 'Trial class rescheduled',
      details: { previous, new: { date, startTime, endTime, timezone: trialTimezone } },
      success: true,
    })], { session });

    await session.commitTransaction();

    res.json({
      success: true,
      data: classData,
      message: 'Trial class rescheduled successfully',
    });
  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('Error rescheduling trial class:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid class ID format' });
    }
    if (error.message?.includes('active pending trial')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to reschedule trial class due to server error',
    });
  } finally {
    await session.endSession();
  }
};

export const markTrialResult = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';
    const { trialResult, trialResultNotes } = req.body;

    const classData = await Class.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    if (classData.classType !== 'trial') {
      return res.status(400).json({ 
        success: false, 
        error: 'This is not a trial class' 
      });
    }

    if (classData.trialResult !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Trial result already marked' 
      });
    }

    if (classData.status === ClassStatus.CANCELLED) {
      return res.status(400).json({
        success: false,
        error: 'Cannot mark result for a cancelled trial class',
      });
    }

    const { endAt } = classWindow(classData);
    const resultOpenAt = new Date(endAt.getTime() - TRIAL_RESULT_EARLY_GRACE_MINUTES * 60 * 1000);
    if (new Date() < resultOpenAt) {
      return res.status(400).json({
        success: false,
        error: `Trial result can be marked during the last ${TRIAL_RESULT_EARLY_GRACE_MINUTES} minutes or after the class ends`,
      });
    }

    classData.trialResult = trialResult as TrialResult;
    classData.trialResultNotes = trialResultNotes;
    classData.trialResultMarkedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined;
    classData.trialResultMarkedAt = new Date();
    classData.status = ClassStatus.COMPLETED;
    if (!classData.trialJoinedAt && classData.trialAttendanceStatus !== 'attended') {
      classData.trialAttendanceStatus = 'no_show';
    }
    await classData.save();

    // Update lead status based on trial result - "Ready to Join" or "Not
    // Ready" per the post-trial evaluation workflow.
    if (classData.leadId) {
      const Lead = (await import('../models/Lead')).default;
      await Lead.findByIdAndUpdate(classData.leadId, {
        status: normalizeTrialResultForLead(trialResult as TrialResult),
      });
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.CLASS,
      entityId: classData._id,
      entityName: `Trial result marked: ${trialResult}`,
      details: { trialResult, trialResultNotes },
      success: true,
    }));

    res.json({
      success: true,
      data: classData,
      message: `Trial marked as ${trialResult}`,
    });
  } catch (error: any) {
    console.error('Error marking trial result:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to mark trial result due to server error',
    });
  }
};

export const getTrialClasses = async (req: AuthRequest, res: Response) => {
  try {
    const { status, coach } = req.query;
    await expireStaleTrials();

    const filter: any = { classType: 'trial' };
    if (status) filter.trialResult = status;
    if (coach) filter.coach = coach;

    const trialClasses = await Class.find(filter)
      .populate('leadId', 'studentName parentName email phoneNumber')
      .populate('coach', 'name email')
      .populate('trialResultMarkedBy', 'name email')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: trialClasses,
    });
  } catch (error: any) {
    console.error('Error fetching trial classes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trial classes due to server error',
    });
  }
};

/**
 * Public endpoint (no auth - a lead has no login) for the "Join Now" link
 * sent to the lead's email. Records the click time so staff/coach have
 * confirmation the lead actually showed up; does not consume any package
 * credit (trials are pre-enrollment, no Package exists yet).
 */
export const joinTrialClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const classData = await Class.findById(id);
    if (!classData || classData.classType !== 'trial') {
      return res.status(404).json({ success: false, error: 'Trial class not found' });
    }
    if (classData.status !== ClassStatus.SCHEDULED || classData.trialResult === 'expired') {
      return res.status(400).json({ success: false, error: 'This trial class is no longer active.' });
    }
    if (!classData.meetingLink) {
      return res.status(400).json({ success: false, error: 'Meeting link is not available for this trial class.' });
    }

    const now = new Date();
    const { startAt, endAt } = classWindow(classData);

    if (now < startAt) {
      return res.status(400).json({
        success: false,
        error: 'This trial class has not started yet.',
        startsAt: startAt,
      });
    }
    if (now > endAt) {
      return res.status(400).json({
        success: false,
        error: 'This trial class has already ended.',
      });
    }

    classData.trialJoinedAt = now;
    classData.trialAttendanceStatus = 'attended';
    await classData.save();

    res.json({
      success: true,
      data: { meetingLink: classData.meetingLink, joinedAt: now },
      message: 'Joining trial class...',
    });
  } catch (error: any) {
    console.error('Error joining trial class:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to join trial class due to server error',
    });
  }
};

/**
 * Lightweight time-gate status check for a single class. The coach's
 * "Start Now"/"Start Class" button and the student/lead's "Join Now"
 * button both poll this to know exactly when to activate, without needing
 * the full class document or running their own clock-skew-prone client-
 * side time math against raw date/startTime/endTime strings.
 */
export const getClassJoinStatus = async (req: Request, res: Response) => {
  try {
    const classData = await Class.findById(req.params.id).select('date startTime endTime timezone status classType');
    if (!classData) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const now = new Date();
    const { startAt, endAt } = classWindow(classData);

    const canJoin = now >= startAt && now <= endAt && classData.status === 'scheduled';
    const hasEnded = now > endAt;

    res.json({
      success: true,
      data: {
        canJoin,
        hasEnded,
        startsAt: startAt,
        endsAt: endAt,
        secondsUntilStart: canJoin ? 0 : Math.max(0, Math.floor((startAt.getTime() - now.getTime()) / 1000)),
      },
    });
  } catch (error: any) {
    console.error('Error checking class join status:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid class ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to check class status due to server error',
    });
  }
};
