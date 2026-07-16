import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AcademyEvent, { AcademyEventStatus, AcademyEventType } from '../models/AcademyEvent';
import { AuthRequest } from '../middleware/auth';
import { ClientAuthRequest } from '../middleware/clientAuth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import Batch, { BatchStatus } from '../models/Batch';
import { buildAuditLogData } from '../middleware/auditLogger';
import { sanitizeQueryParam, sanitizePaginationParams } from '../utils/validation';
import Student from '../models/Student';
import {
  AcademyEventError,
  createAcademyEvent,
  dateOnly,
  effectiveEventStatus,
  eventWindow,
  getStudentEventView,
  isEventJoinOpen,
  refreshEventEligibility,
  validateEventCoach,
} from '../services/academyEventService';

function parseEventType(value: string): AcademyEventType {
  if (value !== AcademyEventType.MASTERCLASS && value !== AcademyEventType.TOURNAMENT) {
    throw new AcademyEventError('Invalid academy event type');
  }
  return value;
}

function serializeEvent(event: any) {
  const status = effectiveEventStatus(event);
  const window = eventWindow(event);
  return {
    _id: event._id.toString(),
    type: event.type,
    name: event.name,
    country: event.country,
    timezone: event.timezone,
    date: event.date,
    startTime: event.startTime,
    durationMinutes: event.durationMinutes,
    coach: event.coach
      ? { _id: event.coach._id?.toString?.() || event.coach.toString(), name: event.coach.name, email: event.coach.email }
      : undefined,
    level: event.level,
    meetingLink: event.meetingLink,
    status,
    eligibleBatchCount: event.eligibleBatchIds?.length || 0,
    accessOpensAt: window.accessOpensAt.toISOString(),
    startsAt: window.startAt.toISOString(),
    joinClosesAt: window.endAt.toISOString(),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function assertFutureEvent(date: string, startTime: string, timezone: string) {
  const startAt = eventWindow({ date: dateOnly(date), startTime, timezone, durationMinutes: 60 }).startAt;
  if (startAt <= new Date()) throw new AcademyEventError('Event date and time must be in the future');
}

export const getAcademyEvents = async (req: AuthRequest, res: Response) => {
  try {
    const type = parseEventType(req.params.type);
    const { country, timezone, coach, level, date, status, page = '1', limit = '100' } = req.query;
    const filter: any = { type };
    const sanitizedCountry = sanitizeQueryParam(country);
    const sanitizedTimezone = sanitizeQueryParam(timezone);
    const sanitizedCoach = sanitizeQueryParam(coach);
    const sanitizedLevel = sanitizeQueryParam(level);
    const sanitizedDate = sanitizeQueryParam(date);
    const sanitizedStatus = sanitizeQueryParam(status);
    if (sanitizedCountry) filter.country = sanitizedCountry;
    if (sanitizedTimezone) filter.timezone = sanitizedTimezone;
    if (sanitizedCoach) filter.coach = sanitizedCoach;
    if (sanitizedLevel) filter.level = sanitizedLevel;
    if (sanitizedStatus) filter.status = sanitizedStatus;
    if (sanitizedDate) filter.date = dateOnly(sanitizedDate);

    const { page: pageNum, limit: limitNum } = sanitizePaginationParams(page, limit);
    const [events, total] = await Promise.all([
      AcademyEvent.find(filter)
        .populate('coach', 'name email')
        .sort({ date: 1, startTime: 1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      AcademyEvent.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: events.map(serializeEvent),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    console.error('Error fetching academy events:', error);
    res.status(error instanceof AcademyEventError ? 400 : 500).json({
      success: false,
      error: error instanceof AcademyEventError ? error.message : 'Failed to fetch academy events',
    });
  }
};

export const createAcademyEventController = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const type = parseEventType(req.params.type);
    const payload = { ...req.body, type };
    assertFutureEvent(payload.date, payload.startTime, payload.timezone);
    let event: any;
    await session.withTransaction(async () => {
      event = await createAcademyEvent(payload, req.user!.userId, session);
      await AuditLog.create([buildAuditLogData(req, {
        action: AuditAction.CREATE,
        entityType: AuditEntityType.CLASS,
        entityId: event._id,
        entityName: `${type} · ${event.name}`,
        details: { type, eligibleBatchCount: event.eligibleBatchIds.length },
        success: true,
      })], { session });
    });
    res.status(201).json({ success: true, data: serializeEvent(event), message: `${type === AcademyEventType.MASTERCLASS ? 'Masterclass' : 'Tournament'} created for ${event.eligibleBatchIds.length} running batch(es)` });
  } catch (error: any) {
    console.error('Error creating academy event:', error);
    res.status(error instanceof AcademyEventError || error.name === 'ValidationError' ? 400 : 500).json({
      success: false,
      error: error instanceof AcademyEventError || error.name === 'ValidationError' ? error.message : 'Failed to create academy event',
    });
  } finally {
    await session.endSession();
  }
};

export const updateAcademyEvent = async (req: AuthRequest, res: Response) => {
  try {
    const type = parseEventType(req.params.type);
    const event = await AcademyEvent.findOne({ _id: req.params.id, type });
    if (!event) return res.status(404).json({ success: false, error: 'Academy event not found' });
    if (event.status === AcademyEventStatus.CANCELLED || event.status === AcademyEventStatus.COMPLETED) {
      return res.status(409).json({ success: false, error: 'Completed or cancelled events cannot be edited' });
    }

    const nextDate = req.body.date || event.date.toISOString().slice(0, 10);
    const nextStartTime = req.body.startTime || event.startTime;
    const nextTimezone = req.body.timezone || event.timezone;
    assertFutureEvent(nextDate, nextStartTime, nextTimezone);
    const eligibilityChanged = ['country', 'timezone', 'level'].some((field) => req.body[field] !== undefined);

    if (req.body.name !== undefined) event.name = req.body.name;
    if (req.body.country !== undefined) event.country = req.body.country;
    if (req.body.timezone !== undefined) event.timezone = req.body.timezone;
    if (req.body.date !== undefined) event.date = dateOnly(req.body.date);
    if (req.body.startTime !== undefined) event.startTime = req.body.startTime;
    if (req.body.durationMinutes !== undefined) event.durationMinutes = req.body.durationMinutes;
    if (req.body.meetingLink !== undefined) event.meetingLink = req.body.meetingLink;
    if (req.body.coach !== undefined) event.coach = await validateEventCoach(req.body.coach);
    if (event.type === AcademyEventType.MASTERCLASS && req.body.level !== undefined) event.level = req.body.level;
    if (eligibilityChanged) await refreshEventEligibility(event);
    await event.save();

    await AuditLog.create(buildAuditLogData(req, {
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.CLASS,
      entityId: event._id,
      entityName: `${type} · ${event.name}`,
      success: true,
    }));
    res.json({ success: true, data: serializeEvent(await AcademyEvent.findById(event._id).populate('coach', 'name email').lean()), message: 'Academy event updated successfully' });
  } catch (error: any) {
    console.error('Error updating academy event:', error);
    res.status(error instanceof AcademyEventError || error.name === 'ValidationError' ? 400 : 500).json({ success: false, error: error instanceof AcademyEventError || error.name === 'ValidationError' ? error.message : 'Failed to update academy event' });
  }
};

export const cancelAcademyEvent = async (req: AuthRequest, res: Response) => {
  try {
    const type = parseEventType(req.params.type);
    const event = await AcademyEvent.findOneAndUpdate(
      { _id: req.params.id, type, status: AcademyEventStatus.SCHEDULED },
      { $set: { status: AcademyEventStatus.CANCELLED, cancelledAt: new Date() } },
      { new: true }
    ).populate('coach', 'name email');
    if (!event) return res.status(404).json({ success: false, error: 'Scheduled academy event not found' });
    await AuditLog.create(buildAuditLogData(req, { action: AuditAction.UPDATE, entityType: AuditEntityType.CLASS, entityId: event._id, entityName: `${type} cancelled · ${event.name}`, success: true }));
    res.json({ success: true, data: serializeEvent(event), message: 'Academy event cancelled' });
  } catch (error) {
    console.error('Error cancelling academy event:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel academy event' });
  }
};

export const getStudentAcademyEvents = async (req: ClientAuthRequest, res: Response) => {
  try {
    const studentId = req.client?.profileId;
    if (!studentId) return res.status(401).json({ success: false, error: 'Student profile ID not found in token' });
    res.json({
      success: true,
      data: await getStudentEventView(studentId),
    });
  } catch (error) {
    console.error('Error fetching student academy events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch academy events' });
  }
};

export const joinStudentAcademyEvent = async (req: ClientAuthRequest, res: Response) => {
  try {
    const studentId = req.client?.profileId;
    if (!studentId) return res.status(401).json({ success: false, error: 'Student profile ID not found in token' });
    const student = await Student.findById(studentId).select('country currentBatchId portalStatus').lean();
    const event = await AcademyEvent.findById(req.params.id).lean();
    const runningBatch = student?.currentBatchId
      ? await Batch.exists({ _id: student.currentBatchId, status: BatchStatus.ONGOING })
      : null;
    if (!student || !event || !runningBatch || !student.currentBatchId || !event.eligibleBatchIds.some((id) => id.toString() === student.currentBatchId!.toString())) {
      return res.status(404).json({ success: false, error: 'Academy event is not assigned to this student' });
    }
    if (student.portalStatus !== 'active') return res.status(403).json({ success: false, error: 'Portal access is currently paused' });
    if (!isEventJoinOpen(event)) return res.status(409).json({ success: false, error: 'Join is available only 10 minutes before the event until it ends' });
    res.json({ success: true, data: { meetingLink: event.meetingLink }, message: 'Event is opening now' });
  } catch (error) {
    console.error('Error joining academy event:', error);
    res.status(500).json({ success: false, error: 'Failed to join academy event' });
  }
};
