import mongoose from 'mongoose';
import AcademyEvent, {
  AcademyEventStatus,
  AcademyEventType,
  EventCountry,
  IAcademyEvent,
} from '../models/AcademyEvent';
import Batch, { BatchStatus } from '../models/Batch';
import Staff, { StaffRole, StaffStatus } from '../models/Staff';
import Student from '../models/Student';
import { localCalendarDateAsUtc, zonedDateTimeToUtc } from '../utils/dateTime';
import { CourseLevel } from '../domain/courseEnrollment';

export class AcademyEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AcademyEventError';
  }
}

export type AcademyEventCriteria = {
  type: AcademyEventType;
  country: EventCountry;
  timezone: string;
  level?: CourseLevel;
};

export type AcademyEventPayload = AcademyEventCriteria & {
  name: string;
  date: string;
  startTime: string;
  durationMinutes?: number;
  coach?: string;
  meetingLink: string;
};

export function dateOnly(value: Date | string): Date {
  const isoDate = value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function eventWindow(event: Pick<IAcademyEvent, 'date' | 'startTime' | 'durationMinutes'> & { timezone: string }) {
  const startAt = zonedDateTimeToUtc(event.date, event.startTime, event.timezone);
  const endAt = new Date(startAt.getTime() + event.durationMinutes * 60_000);
  const accessOpensAt = new Date(startAt.getTime() - 10 * 60_000);
  return { accessOpensAt, startAt, endAt };
}

export function effectiveEventStatus(event: Pick<IAcademyEvent, 'status' | 'date' | 'startTime' | 'durationMinutes'> & { timezone: string }, now = new Date()): AcademyEventStatus {
  if (event.status === AcademyEventStatus.CANCELLED) return AcademyEventStatus.CANCELLED;
  if (event.status === AcademyEventStatus.COMPLETED) return AcademyEventStatus.COMPLETED;
  return eventWindow(event).endAt <= now ? AcademyEventStatus.COMPLETED : AcademyEventStatus.SCHEDULED;
}

export function isEventJoinOpen(event: Pick<IAcademyEvent, 'status' | 'date' | 'startTime' | 'durationMinutes'> & { timezone: string }, now = new Date()) {
  const { accessOpensAt, startAt, endAt } = eventWindow(event);
  return event.status === AcademyEventStatus.SCHEDULED && now >= accessOpensAt && now <= endAt;
}

export async function findEligibleRunningBatchIds(criteria: AcademyEventCriteria, session?: mongoose.ClientSession): Promise<mongoose.Types.ObjectId[]> {
  const batchQuery = Batch.find({
    status: BatchStatus.ONGOING,
    timezone: criteria.timezone,
    ...(criteria.type === AcademyEventType.MASTERCLASS
      ? { courseLevel: criteria.level === 'Expert' ? { $in: ['Expert', 'Master'] } : criteria.level }
      : {}),
  }).select('_id students');
  if (session) batchQuery.session(session);
  const batches = await batchQuery.lean();
  if (batches.length === 0) return [];

  const studentIds = batches.flatMap((batch) => batch.students.map((id) => id.toString()));
  const studentQuery = Student.find({
    _id: { $in: studentIds },
    country: criteria.country,
    portalStatus: { $nin: ['frozen', 'expired'] },
  }).select('_id');
  if (session) studentQuery.session(session);
  const eligibleStudentIds = new Set((await studentQuery.lean()).map((student) => student._id.toString()));

  return batches
    .filter((batch) => batch.students.some((studentId) => eligibleStudentIds.has(studentId.toString())))
    .map((batch) => batch._id);
}

export async function validateEventCoach(coachId: string | undefined, session?: mongoose.ClientSession) {
  if (!coachId) return undefined;
  const query = Staff.findOne({ _id: coachId, role: StaffRole.COACH, status: StaffStatus.ACTIVE }).select('_id');
  if (session) query.session(session);
  const coach = await query.lean();
  if (!coach) throw new AcademyEventError('Selected coach must be an active coach');
  return coach._id;
}

export async function resolveEventEligibility(criteria: AcademyEventCriteria, session?: mongoose.ClientSession) {
  const eligibleBatchIds = await findEligibleRunningBatchIds(criteria, session);
  if (eligibleBatchIds.length === 0) {
    throw new AcademyEventError(
      criteria.type === AcademyEventType.MASTERCLASS
        ? 'No running batch matches the selected country, timezone, and level'
        : 'No running batch matches the selected country and timezone'
    );
  }
  return eligibleBatchIds;
}

export async function createAcademyEvent(payload: AcademyEventPayload, createdBy: string, session?: mongoose.ClientSession) {
  const coach = await validateEventCoach(payload.coach, session);
  const eligibleBatchIds = await resolveEventEligibility(payload, session);
  const eventData = {
    ...payload,
    date: dateOnly(payload.date),
    durationMinutes: payload.durationMinutes ?? 60,
    coach,
    eligibleBatchIds,
    status: AcademyEventStatus.SCHEDULED,
    createdBy,
  };
  const created = await AcademyEvent.create([eventData], session ? { session } : undefined);
  return created[0];
}

export async function refreshEventEligibility(event: IAcademyEvent, session?: mongoose.ClientSession) {
  const eligibleBatchIds = await resolveEventEligibility({
    type: event.type,
    country: event.country,
    timezone: event.timezone,
    ...(event.level ? { level: event.level } : {}),
  }, session);
  event.eligibleBatchIds = eligibleBatchIds;
}

export async function getStudentEventView(studentId: string) {
  const student = await Student.findById(studentId).select('country timezone currentBatchId portalStatus').lean();
  if (!student || !student.currentBatchId || !student.country) return [];
  const runningBatch = await Batch.exists({ _id: student.currentBatchId, status: BatchStatus.ONGOING });
  if (!runningBatch) return [];
  const today = localCalendarDateAsUtc(student.timezone);
  const events = await AcademyEvent.find({
    eligibleBatchIds: student.currentBatchId,
    country: student.country,
    status: AcademyEventStatus.SCHEDULED,
    date: { $gte: today },
  })
    .populate('coach', 'name email')
    .sort({ date: 1, startTime: 1 })
    .limit(30)
    .lean();
  const now = new Date();
  return events.map((event: any) => {
    const window = eventWindow(event);
    return {
      _id: event._id.toString(),
      type: event.type,
      name: event.name,
      country: event.country,
      timezone: event.timezone,
      level: event.level,
      date: event.date,
      startTime: event.startTime,
      durationMinutes: event.durationMinutes,
      status: effectiveEventStatus(event, now),
      hasMeetingLink: student.portalStatus === 'active' && Boolean(event.meetingLink),
      canJoin: student.portalStatus === 'active' && isEventJoinOpen(event, now),
      accessOpensAt: window.accessOpensAt.toISOString(),
      startsAt: window.startAt.toISOString(),
      joinClosesAt: window.endAt.toISOString(),
      coach: event.coach ? { name: event.coach.name, email: event.coach.email } : undefined,
    };
  });
}
