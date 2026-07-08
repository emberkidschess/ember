import { Response } from 'express';
import Batch, { BatchStatus } from '../models/Batch';
import { AuthRequest } from '../middleware/auth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { validateStudent, validateStaff, validateBatch } from '../utils/foreignKeys';
import { buildAuditLogData } from '../middleware/auditLogger';
import { sanitizeQueryParam, sanitizePaginationParams } from '../utils/validation';
import { CacheService, generateCacheKey, CacheNamespaces } from '../utils/cache';

export const getBatches = async (req: AuthRequest, res: Response) => {
  try {
    const { status, courseLevel, coach, page = '1', limit = '20' } = req.query;

    const filter: any = {};
    
    const sanitizedStatus = sanitizeQueryParam(status);
    const sanitizedCourseLevel = sanitizeQueryParam(courseLevel);
    const sanitizedCoach = sanitizeQueryParam(coach);
    
    if (sanitizedStatus) filter.status = sanitizedStatus;
    if (sanitizedCourseLevel) filter.courseLevel = sanitizedCourseLevel;
    if (sanitizedCoach) filter.coach = sanitizedCoach;

    const { page: pageNum, limit: limitNum } = sanitizePaginationParams(page, limit);
    const skip = (pageNum - 1) * limitNum;

    // Generate cache key based on filters and pagination
    const cacheKey = generateCacheKey(
      CacheNamespaces.BATCH_LIST,
      `${sanitizedStatus}-${sanitizedCourseLevel}-${sanitizedCoach}-${pageNum}-${limitNum}`
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
        .select('name courseLevel coach students status schedule timezone startDate completedAt notes totalSessions sessionsCompleted sessions createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Batch.countDocuments(filter)
    ]);

    const result = {
      data: batches,
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
      .select('name courseLevel coach students status schedule timezone startDate completedAt totalSessions sessionsCompleted createdAt')
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

    res.json({
      success: true,
      data: batch,
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
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';
    const { name, courseLevel, coach, students, schedule, timezone, startDate, notes, whatsappCommunityLink } = req.body;

    await validateStaff(coach);

    const studentIds: string[] = Array.isArray(students) ? students : [];
    if (studentIds.length > 0) {
      await Promise.all(studentIds.map((id) => validateStudent(id)));
    }

    const existing = await Batch.findOne({ courseLevel, name });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `A batch named "${name}" already exists for ${courseLevel}`,
      });
    }

    const batch = await Batch.create({
      name,
      courseLevel,
      coach,
      students: studentIds,
      schedule,
      timezone,
      startDate,
      notes,
      whatsappCommunityLink,
      status: BatchStatus.UPCOMING,
      createdBy: req.user?.userId,
    });

    if (studentIds.length > 0) {
      const Student = (await import('../models/Student')).default;
      await Student.updateMany(
        { _id: { $in: studentIds } }, 
        { 
          currentBatchId: batch._id,
          ...(whatsappCommunityLink && { whatsappCommunityLink })
        }
      );

      // Send WhatsApp link email to students if link is provided
      if (whatsappCommunityLink) {
        const emailService = (await import('../services/emailService')).default;
        const students = await Student.find({ _id: { $in: studentIds } });
        
        for (const student of students) {
          await emailService.sendTemplatedEmail(
            student.email,
            'batch_whatsapp_link',
            {
              parentName: student.parentName,
              studentName: student.studentName,
              batchName: batch.name,
              courseLevel: batch.courseLevel,
              whatsappLink: whatsappCommunityLink,
              schedule: batch.schedule,
            }
          );
        }
      }
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.CREATE,
      entityType: AuditEntityType.BATCH,
      entityId: batch._id,
      entityName: `${batch.name} (${batch.courseLevel})`,
      success: true,
    }));

    // Invalidate batch list cache
    await CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`);

    res.status(201).json({
      success: true,
      data: batch,
      message: 'Batch created successfully',
    });
  } catch (error: any) {
    console.error('Error creating batch:', error);
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
    res.status(500).json({
      success: false,
      error: 'Failed to create batch due to server error',
    });
  }
};

export const updateBatch = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';
    const { name, coach, schedule, timezone, startDate, notes } = req.body;

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    if (coach) await validateStaff(coach);

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

    if (coach) batch.coach = coach;
    if (schedule !== undefined) batch.schedule = schedule;
    if (timezone !== undefined) batch.timezone = timezone;
    if (startDate !== undefined) batch.startDate = startDate;
    if (notes !== undefined) batch.notes = notes;

    await batch.save();

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
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
      data: batch,
      message: 'Batch updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating batch:', error);
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
    await CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`);
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

    await Promise.all(studentIds.map((id) => validateStudent(id)));

    const existingIds = new Set(batch.students.map((id) => id.toString()));
    const newIds = studentIds.filter((id) => !existingIds.has(id));

    batch.students.push(...(newIds as any[]));
    await batch.save();

    if (newIds.length > 0) {
      const Student = (await import('../models/Student')).default;
      await Student.updateMany({ _id: { $in: newIds } }, { currentBatchId: batch._id });
    }

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.BATCH,
      entityId: batch._id,
      entityName: `Added ${newIds.length} student(s) to ${batch.name}`,
      success: true,
    }));

    // Invalidate batch list cache and specific batch cache
    await CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`);
    await CacheService.delete(generateCacheKey(CacheNamespaces.BATCH_DETAILS, req.params.id));

    const populated = await Batch.findById(batch._id).populate('students', 'studentName parentName email studentStatus');

    res.json({
      success: true,
      data: populated,
      message: 'Students added to batch successfully',
    });
  } catch (error: any) {
    console.error('Error adding students to batch:', error);
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

    batch.students = batch.students.filter((id) => id.toString() !== studentId) as any;
    await batch.save();

    const Student = (await import('../models/Student')).default;
    await Student.updateOne({ _id: studentId, currentBatchId: batch._id }, { $unset: { currentBatchId: '' } });

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
  [BatchStatus.COMPLETED]: [BatchStatus.ONGOING],
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

export const deleteBatch = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const Class = (await import('../models/Class')).default;
    const classCount = await Class.countDocuments({ batch: batch._id });
    if (batch.students.length > 0 || classCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Batches with students or class history cannot be deleted. Mark the batch completed instead.',
      });
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
