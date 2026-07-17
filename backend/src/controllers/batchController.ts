import { Response } from 'express';
import mongoose from 'mongoose';
import Batch, { BatchStatus } from '../models/Batch';
import Staff, { StaffRole, StaffStatus } from '../models/Staff';
import Student, { EnrollmentStatus, PortalStatus, StudentStatus } from '../models/Student';
import Package, { PackageStatus } from '../models/Package';
import { AuthRequest } from '../middleware/auth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { buildAuditLogData } from '../middleware/auditLogger';
import { sanitizeQueryParam, sanitizePaginationParams } from '../utils/validation';
import { CacheService, generateCacheKey, CacheNamespaces } from '../utils/cache';
import {
  addStudentsToScheduledBatchClasses,
  assertCoachAvailableForScheduledBatch,
  assertStudentsAvailableForScheduledBatch,
  BatchSchedulingError,
  createExtraBatchClass,
  findNextBatchClass,
  findNextBatchClasses,
  formatRecurringSchedule,
  generateRecurringClasses,
  removeStudentFromScheduledBatchClasses,
} from '../services/batchSchedulingService';

async function findActiveCoach(
  coachId: string,
  session?: mongoose.ClientSession
) {
  if (!mongoose.Types.ObjectId.isValid(coachId)) {
    throw new BatchSchedulingError('Invalid coach ID');
  }
  const query = Staff.findOne({
    _id: coachId,
    role: StaffRole.COACH,
    status: StaffStatus.ACTIVE,
  }).select('defaultClassLink');
  if (session) query.session(session);
  const coach = await query.lean();
  if (!coach) {
    throw new BatchSchedulingError('Selected coach must be an active coach');
  }
  if (!coach.defaultClassLink) {
    throw new BatchSchedulingError(
      'Selected coach must have a default class link before creating or assigning a batch'
    );
  }
  return coach;
}

/**
 * A batch can be created empty, but every student added to it must have an
 * active, matching package.  Without this check a student could be put into
 * a wrong-level batch and only discover the failure when trying to join.
 */
async function assertStudentsEligibleForBatch(
  studentIds: string[],
  courseLevel: string,
  session?: mongoose.ClientSession
): Promise<void> {
  if (studentIds.length === 0) return;
  if (studentIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new BatchSchedulingError('One or more selected student IDs are invalid');
  }

  const studentsQuery = Student.find({ _id: { $in: studentIds } })
    .select('_id studentName currentPackageId currentBatchId studentStatus enrollmentStatus portalStatus');
  if (session) studentsQuery.session(session);
  const students = await studentsQuery.lean();
  if (students.length !== studentIds.length) {
    throw new BatchSchedulingError('One or more selected students no longer exist');
  }

  const packageIds = students
    .map((student) => student.currentPackageId?.toString())
    .filter((id): id is string => Boolean(id));
  const packageQuery = Package.find({
    _id: { $in: packageIds },
    status: PackageStatus.ACTIVE,
    remainingClasses: { $gt: 0 },
    courseLevel: courseLevel === 'Expert' ? { $in: ['Expert', 'Master'] } : courseLevel,
  }).select('_id');
  if (session) packageQuery.session(session);
  const matchingPackageIds = new Set(
    (await packageQuery.lean()).map((packageItem) => packageItem._id.toString())
  );
  const currentBatchIds = students
    .map((student) => student.currentBatchId?.toString())
    .filter((id): id is string => Boolean(id));
  const activeBatchIds = new Set(
    (await Batch.find({ _id: { $in: currentBatchIds }, status: { $in: [BatchStatus.UPCOMING, BatchStatus.ONGOING] } })
      .select('_id')
      .lean())
      .map((batch) => batch._id.toString())
  );

  const ineligible = students.find((student) =>
    student.studentStatus !== StudentStatus.ACTIVE ||
    student.enrollmentStatus !== EnrollmentStatus.ENROLLED ||
    student.portalStatus !== PortalStatus.ACTIVE ||
    !student.currentPackageId ||
    !matchingPackageIds.has(student.currentPackageId.toString()) ||
    Boolean(student.currentBatchId && activeBatchIds.has(student.currentBatchId.toString()))
  );
  if (ineligible) {
    const isInAnotherActiveBatch = Boolean(
      ineligible.currentBatchId && activeBatchIds.has(ineligible.currentBatchId.toString())
    );
    throw new BatchSchedulingError(
      isInAnotherActiveBatch
        ? `${ineligible.studentName} is already assigned to an active batch`
        : `${ineligible.studentName} needs an active ${courseLevel} package and an active portal before joining this batch`
    );
  }
}

export const getBatches = async (req: AuthRequest, res: Response) => {
  try {
    const { status, courseLevel, coach, page = '1', limit = '20' } = req.query;

    const filter: any = {};
    
    const sanitizedStatus = sanitizeQueryParam(status);
    const sanitizedCourseLevel = sanitizeQueryParam(courseLevel);
    const sanitizedCoach = sanitizeQueryParam(coach);
    
    if (sanitizedStatus) filter.status = sanitizedStatus;
    if (sanitizedCourseLevel) filter.courseLevel = sanitizedCourseLevel;
    const scopedCoach = req.user?.role === 'coach' ? req.user.userId : sanitizedCoach;
    if (scopedCoach) filter.coach = scopedCoach;

    const { page: pageNum, limit: limitNum } = sanitizePaginationParams(page, limit);
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key based on filters and pagination
    const cacheKey = generateCacheKey(
      CacheNamespaces.BATCH_LIST,
      `${req.user?.role}-${scopedCoach || 'all'}-${sanitizedStatus}-${sanitizedCourseLevel}-${pageNum}-${limitNum}`
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

    const [batches, total] = await Promise.all([
      Batch.find(filter)
        .populate('students', 'studentName parentName email studentStatus')
        .populate('coach', 'name email')
        .populate('createdBy', 'name email')
        .select('name courseLevel coach students status schedule timezone startDate completedAt notes whatsappCommunityLink automationEnabled frequencyDays classStartTime classDurationMinutes meetingLink accessOpensMinutesBefore totalSessions sessionsCompleted sessions createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Batch.countDocuments(filter)
    ]);

    const nextClasses = await findNextBatchClasses(batches.map((batch: any) => batch._id));
    const data = batches.map((batch: any) => ({
      ...batch,
      studentCount: batch.students?.length || 0,
      nextUpcomingClass: nextClasses.get(batch._id.toString()) || null,
    }));

    const result = {
      data,
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
    console.error('Error fetching batches:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid filter parameter format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batches due to server error',
    });
  }
};

/** Completed batches, grouped for a history view - admin-wide or scoped to one coach. */
export const getBatchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = { status: BatchStatus.COMPLETED };

    // A coach hitting this endpoint only sees their own batch history; an
    // admin can see everyone's (optionally still narrowed by ?coach=).
    if (req.user?.role === 'coach') {
      filter.coach = req.user.userId;
    } else if (req.query.coach) {
      filter.coach = req.query.coach;
    }

    const batches = await Batch.find(filter)
      .populate('students', 'studentName parentName')
      .populate('coach', 'name email')
      .select('name courseLevel coach students status schedule timezone startDate completedAt whatsappCommunityLink automationEnabled frequencyDays classStartTime classDurationMinutes meetingLink accessOpensMinutesBefore totalSessions sessionsCompleted createdAt')
      .sort({ completedAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      data: batches,
    });
  } catch (error: any) {
    console.error('Error fetching batch history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch history due to server error',
    });
  }
};

export const getBatchById = async (req: AuthRequest, res: Response) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('students', 'studentName parentName email phoneNumber studentStatus')
      .populate('coach', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    if (req.user?.role === 'coach') {
      const coachId = batch.coach && typeof batch.coach === 'object' && '_id' in batch.coach
        ? String((batch.coach as any)._id)
        : String(batch.coach);
      if (coachId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'This batch is not assigned to you' });
      }
    }

    res.json({
      success: true,
      data: {
        ...batch,
        studentCount: batch.students?.length || 0,
        nextUpcomingClass: await findNextBatchClass(batch._id),
      },
    });
  } catch (error: any) {
    console.error('Error fetching batch:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch due to server error',
    });
  }
};

export const createBatch = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const {
      name, courseLevel, coach, students, frequencyDays, classStartTime,
      classDurationMinutes, accessOpensMinutesBefore, timezone, startDate,
      notes, whatsappCommunityLink,
    } = req.body;

    const assignedCoach = await findActiveCoach(coach, session);

    const studentIds: string[] = Array.isArray(students) ? [...new Set(students)] : [];
    await assertStudentsEligibleForBatch(studentIds, courseLevel, session);

    const existing = await Batch.findOne({ courseLevel, name });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `A batch named "${name}" already exists for ${courseLevel}`,
      });
    }

    let batch: any;
    await session.withTransaction(async () => {
      [batch] = await Batch.create([{
        name, courseLevel, coach, students: studentIds,
        schedule: formatRecurringSchedule(frequencyDays, classStartTime, timezone),
        timezone, startDate, automationEnabled: true, frequencyDays,
        classStartTime, classDurationMinutes, meetingLink: assignedCoach.defaultClassLink,
        accessOpensMinutesBefore: accessOpensMinutesBefore ?? 10,
        notes, whatsappCommunityLink, status: BatchStatus.UPCOMING,
        createdBy: req.user?.userId,
      }], { session });

      await generateRecurringClasses(batch, req.user!.userId, { session });

      if (studentIds.length > 0) {
        const Student = (await import('../models/Student')).default;
        await Student.updateMany(
          { _id: { $in: studentIds } },
          {
            $set: {
              currentBatchId: batch._id,
              assignedStaff: coach,
              course: courseLevel,
              whatsappCommunityLink,
            },
          },
          { session }
        );
      }

      await AuditLog.create([buildAuditLogData(req, {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.BATCH,
        entityId: batch._id,
        entityName: `${batch.name} (${batch.courseLevel})`,
        details: { generatedClasses: batch.totalSessions },
        success: true,
      })], { session });
    });

    if (studentIds.length > 0) {
      const Student = (await import('../models/Student')).default;
      const emailService = (await import('../services/emailService')).default;
      const assignedStudents = await Student.find({ _id: { $in: studentIds } });
      await Promise.allSettled(assignedStudents.map((student) =>
        emailService.sendTemplatedEmail(student.email, 'batch_whatsapp_link', {
          parentName: student.parentName,
          studentName: student.studentName,
          batchName: batch.name,
          courseLevel: batch.courseLevel,
          whatsappLink: whatsappCommunityLink,
          schedule: batch.schedule,
        })
      ));
    }

    // Invalidate batch list cache
    await Promise.all([
      CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`),
      CacheService.deletePattern(`${CacheNamespaces.STUDENT_LIST}:*`),
    ]);

    res.status(201).json({
      success: true,
      data: batch,
      message: `Batch created and ${batch.totalSessions} recurring classes scheduled automatically`,
    });
  } catch (error: any) {
    console.error('Error creating batch:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A batch with this name already exists for the selected course',
      });
    }
    if (error.name === 'ValidationError' || error instanceof BatchSchedulingError) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid coach or student ID' });
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
    res.status(500).json({
      success: false,
      error: 'Failed to create batch due to server error',
    });
  } finally {
    await session.endSession();
  }
};

export const updateBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { name, coach, notes, whatsappCommunityLink } = req.body;

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    let nextCoachDefaultLink: string | undefined;
    if (coach) {
      const nextCoach = await findActiveCoach(coach);
      nextCoachDefaultLink = nextCoach.defaultClassLink;
    }

    if (name && name !== batch.name) {
      const existing = await Batch.findOne({ courseLevel: batch.courseLevel, name, _id: { $ne: batch._id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `A batch named "${name}" already exists for ${batch.courseLevel}`,
        });
      }
      batch.name = name;
    }

    const structuralScheduleFields = ['frequencyDays', 'classStartTime', 'classDurationMinutes', 'timezone', 'startDate'];
    if (batch.automationEnabled && structuralScheduleFields.some((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field)
    )) {
      return res.status(409).json({
        success: false,
        error: 'Recurring schedule fields cannot be changed after classes are generated. Reschedule an individual class instead.',
      });
    }

    const previousCoach = batch.coach.toString();
    if (coach && coach !== previousCoach) {
      await assertCoachAvailableForScheduledBatch(batch._id, coach);
    }
    if (coach) batch.coach = coach;
    if (notes !== undefined) batch.notes = notes;
    if (nextCoachDefaultLink) batch.meetingLink = nextCoachDefaultLink;
    if (whatsappCommunityLink !== undefined) batch.whatsappCommunityLink = whatsappCommunityLink;

    await batch.save();

    const Class = (await import('../models/Class')).default;
    const Attendance = (await import('../models/Attendance')).default;
    if (nextCoachDefaultLink) {
      await Class.updateMany(
        { batch: batch._id, status: 'scheduled', meetingLinkSource: 'batch' },
        { $set: { meetingLink: nextCoachDefaultLink } }
      );
    }
    if (coach && coach !== previousCoach) {
      const futureClasses = await Class.find({ batch: batch._id, status: 'scheduled' }).select('_id');
      const classIds = futureClasses.map((item) => item._id);
      await Class.updateMany({ _id: { $in: classIds } }, { $set: { coach } });
      await Attendance.updateMany({ class: { $in: classIds } }, { $set: { coach } });
      const Student = (await import('../models/Student')).default;
      await Student.updateMany(
        { _id: { $in: batch.students }, currentBatchId: batch._id },
        { $set: { assignedStaff: coach } }
      );
    }
    if (whatsappCommunityLink !== undefined) {
      const Student = (await import('../models/Student')).default;
      await Student.updateMany({ _id: { $in: batch.students } }, { $set: { whatsappCommunityLink } });
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.BATCH,
      entityId: batch._id,
      entityName: `${batch.name} (${batch.courseLevel})`,
      success: true,
    }));

    // Invalidate batch list cache and specific batch cache
    await Promise.all([
      CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`),
      CacheService.deletePattern(`${CacheNamespaces.STUDENT_LIST}:*`),
    ]);
    await CacheService.delete(generateCacheKey(CacheNamespaces.BATCH_DETAILS, req.params.id));

    res.json({
      success: true,
      data: batch,
      message: 'Batch updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating batch:', error);
    if (error instanceof BatchSchedulingError) {
      return res.status(409).json({
        success: false,
        error: error.message,
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
        error: 'Invalid batch ID format',
      });
    }
    if (error.message?.includes('Staff not found')) {
      return res.status(400).json({
        success: false,
        error: 'Assigned coach does not exist',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update batch due to server error',
    });
  }
};

/** Renames the batch and/or changes its course level - kept distinct from
 * generic field edits since renaming implicitly re-checks the uniqueness
 * constraint against the (possibly new) course level. */
export const renameBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { name, courseLevel } = req.body;
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const nextCourseLevel = courseLevel || batch.courseLevel;
    const nextName = name || batch.name;

    const existing = await Batch.findOne({ courseLevel: nextCourseLevel, name: nextName, _id: { $ne: batch._id } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `A batch named "${nextName}" already exists for ${nextCourseLevel}`,
      });
    }

    const previousName = batch.name;
    if (
      courseLevel &&
      courseLevel !== batch.courseLevel &&
      (batch.sessionsCompleted > 0 || batch.sessions.some((session) => session.status !== 'planned'))
    ) {
      return res.status(409).json({
        success: false,
        error: 'Course level cannot change after batch sessions have been scheduled.',
      });
    }
    batch.name = nextName;
    batch.courseLevel = nextCourseLevel;
    await batch.save();

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.BATCH,
      entityId: batch._id,
      entityName: `Renamed "${previousName}" to "${nextName}"`,
      success: true,
    }));

    // Invalidate batch list cache and specific batch cache
    await Promise.all([
      CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`),
      CacheService.deletePattern(`${CacheNamespaces.STUDENT_LIST}:*`),
    ]);
    await CacheService.delete(generateCacheKey(CacheNamespaces.BATCH_DETAILS, req.params.id));

    res.json({
      success: true,
      data: batch,
      message: 'Batch renamed successfully',
    });
  } catch (error: any) {
    console.error('Error renaming batch:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to rename batch due to server error',
    });
  }
};

export const addStudentsToBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { studentIds } = req.body as { studentIds: string[] };
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    if (batch.status === BatchStatus.COMPLETED) {
      return res.status(409).json({
        success: false,
        error: 'A completed batch roster is locked',
      });
    }

    const existingIds = new Set(batch.students.map((id) => id.toString()));
    const newIds = [...new Set(studentIds)].filter((id) => !existingIds.has(id));

    await assertStudentsEligibleForBatch(newIds, batch.courseLevel);

    await assertStudentsAvailableForScheduledBatch(batch._id, newIds);

    batch.students.push(...(newIds as any[]));
    await batch.save();

    if (newIds.length > 0) {
      const Student = (await import('../models/Student')).default;
      await Student.updateMany(
        { _id: { $in: newIds } },
        {
          $set: {
            currentBatchId: batch._id,
            assignedStaff: batch.coach,
            course: batch.courseLevel,
            ...(batch.whatsappCommunityLink ? { whatsappCommunityLink: batch.whatsappCommunityLink } : {}),
          },
        }
      );
      await addStudentsToScheduledBatchClasses(batch._id, newIds);
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.BATCH,
      entityId: batch._id,
      entityName: `Added ${newIds.length} student(s) to ${batch.name}`,
      success: true,
    }));

    // Invalidate batch list cache and specific batch cache
    await Promise.all([
      CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`),
      CacheService.deletePattern(`${CacheNamespaces.STUDENT_LIST}:*`),
    ]);
    await CacheService.delete(generateCacheKey(CacheNamespaces.BATCH_DETAILS, req.params.id));

    const populated = await Batch.findById(batch._id).populate('students', 'studentName parentName email studentStatus');

    res.json({
      success: true,
      data: populated,
      message: 'Students added to batch successfully',
    });
  } catch (error: any) {
    console.error('Error adding students to batch:', error);
    if (error instanceof BatchSchedulingError) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch ID format',
      });
    }
    if (error.message?.includes('Student not found')) {
      return res.status(400).json({
        success: false,
        error: 'One or more students do not exist',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to add students to batch due to server error',
    });
  }
};

export const removeStudentFromBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    if (batch.status === BatchStatus.COMPLETED) {
      return res.status(409).json({
        success: false,
        error: 'A completed batch roster is locked',
      });
    }

    batch.students = batch.students.filter((id) => id.toString() !== studentId) as any;
    await batch.save();

    const Student = (await import('../models/Student')).default;
    await Student.updateOne({ _id: studentId, currentBatchId: batch._id }, { $unset: { currentBatchId: '' } });
    await Student.updateOne(
      { _id: studentId, assignedStaff: batch.coach },
      { $unset: { assignedStaff: '' } }
    );
    await removeStudentFromScheduledBatchClasses(batch._id, studentId);

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.BATCH,
      entityId: batch._id,
      entityName: `Removed a student from ${batch.name}`,
      success: true,
    }));

    // Invalidate batch list cache and specific batch cache
    await CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`);
    await CacheService.delete(generateCacheKey(CacheNamespaces.BATCH_DETAILS, req.params.id));

    const populated = await Batch.findById(batch._id).populate('students', 'studentName parentName email studentStatus');

    res.json({
      success: true,
      data: populated,
      message: 'Student removed from batch successfully',
    });
  } catch (error: any) {
    console.error('Error removing student from batch:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch ID or student ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to remove student from batch due to server error',
    });
  }
};

const ALLOWED_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  [BatchStatus.UPCOMING]: [BatchStatus.ONGOING, BatchStatus.COMPLETED],
  [BatchStatus.ONGOING]: [BatchStatus.COMPLETED, BatchStatus.UPCOMING],
  [BatchStatus.COMPLETED]: [],
};

export const updateBatchStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body as { status: BatchStatus };
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    if (!ALLOWED_TRANSITIONS[batch.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot move a batch from ${batch.status} to ${status}`,
      });
    }

    batch.status = status;
    batch.completedAt = status === BatchStatus.COMPLETED ? new Date() : undefined;
    await batch.save();

    if (status === BatchStatus.COMPLETED) {
      const Class = (await import('../models/Class')).default;
      const Attendance = (await import('../models/Attendance')).default;
      const scheduled = await Class.find({ batch: batch._id, status: 'scheduled' }).select('_id');
      const classIds = scheduled.map((item) => item._id);
      await Class.updateMany(
        { _id: { $in: classIds } },
        { $set: { status: 'cancelled', cancellationReason: 'Batch completed' } }
      );
      await Attendance.deleteMany({
        class: { $in: classIds },
        status: 'not_marked',
        attendanceConsumed: false,
      });
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.BATCH,
      entityId: batch._id,
      entityName: `${batch.name} marked ${status}`,
      success: true,
    }));

    // Invalidate batch list cache and specific batch cache
    await CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`);
    await CacheService.delete(generateCacheKey(CacheNamespaces.BATCH_DETAILS, req.params.id));

    res.json({
      success: true,
      data: batch,
      message: `Batch marked as ${status}`,
    });
  } catch (error: any) {
    console.error('Error updating batch status:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update batch status due to server error',
    });
  }
};

export const createExtraClass = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  try {
    let classItem: any;
    await session.withTransaction(async () => {
      const batch = await Batch.findById(req.params.id).session(session);
      if (!batch) throw new BatchSchedulingError('Batch not found');
      classItem = await createExtraBatchClass(batch, req.body, req.user!.userId, { session });
      await AuditLog.create([buildAuditLogData(req, {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.CLASS,
        entityId: classItem._id,
        entityName: `Extra class for ${batch.name}`,
        details: { reason: req.body.reason },
        success: true,
      })], { session });
    });

    try {
      const { notifyClassScheduled } = await import('../utils/classNotifications');
      await notifyClassScheduled(
        classItem._id.toString(),
        classItem.students.map((studentId: any) => studentId.toString())
      );
    } catch (notificationError) {
      console.error('Failed to send extra-class notifications:', notificationError);
    }

    await CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`);
    await CacheService.delete(generateCacheKey(CacheNamespaces.BATCH_DETAILS, req.params.id));
    return res.status(201).json({
      success: true,
      data: classItem,
      message: 'Extra class scheduled for everyone in the batch',
    });
  } catch (error: any) {
    console.error('Error creating extra class:', error);
    if (error instanceof BatchSchedulingError || error.name === 'ValidationError') {
      return res.status(error.message === 'Batch not found' ? 404 : 400).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to schedule extra class' });
  } finally {
    await session.endSession();
  }
};

export const deleteBatch = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const Class = (await import('../models/Class')).default;
    const classes = await Class.find({ batch: batch._id }).select('_id status autoGenerated');
    const hasHistoryOrManualClasses = classes.some(
      (classItem) => classItem.status !== 'scheduled' || !classItem.autoGenerated
    );
    if (batch.students.length > 0 || hasHistoryOrManualClasses) {
      return res.status(409).json({
        success: false,
        error: 'Batches with students or class history cannot be deleted. Mark the batch completed instead.',
      });
    }

    const classIds = classes.map((classItem) => classItem._id);
    if (classIds.length > 0) {
      const Attendance = (await import('../models/Attendance')).default;
      await Attendance.deleteMany({ class: { $in: classIds } });
      await Class.deleteMany({ _id: { $in: classIds } });
    }
    await batch.deleteOne();

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.DELETE,
      entityType: AuditEntityType.BATCH,
      entityId: batch._id,
      entityName: `${batch.name} (${batch.courseLevel})`,
      success: true,
    }));

    // Invalidate batch list cache and specific batch cache
    await CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`);
    await CacheService.delete(generateCacheKey(CacheNamespaces.BATCH_DETAILS, req.params.id));

    res.json({
      success: true,
      message: 'Batch deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting batch:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch ID format',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to delete batch due to server error',
    });
  }
};
