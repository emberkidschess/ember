import mongoose from 'mongoose';
import Batch, { BatchStatus, IBatch } from '../models/Batch';
import Class, { ClassStatus, IClass } from '../models/Class';
import Attendance, { AttendanceStatus } from '../models/Attendance';
import Student from '../models/Student';
import { classAccessWindow, classWindow } from '../utils/dateTime';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export class BatchSchedulingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BatchSchedulingError';
  }
}

type SessionOption = { session?: mongoose.ClientSession };

export type ExtraClassInput = {
  date: string;
  startTime: string;
  timezone: string;
  durationMinutes: number;
  meetingLink: string;
  accessOpensMinutesBefore?: number;
  reason?: string;
};

function dateOnly(value: Date | string): Date {
  const isoDate =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : value.slice(0, 10);
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addMinutesToTime(
  startTime: string,
  durationMinutes: number
): string {
  const [hour, minute] = startTime.split(':').map(Number);
  const total = (hour * 60 + minute + durationMinutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function buildRecurringClassDates(
  startDate: Date | string,
  frequencyDays: number[],
  totalSessions: number
): Date[] {
  if (frequencyDays.length === 0) {
    throw new BatchSchedulingError(
      'At least one batch frequency day is required'
    );
  }
  const allowedDays = new Set(frequencyDays);
  const dates: Date[] = [];
  const cursor = dateOnly(startDate);
  const safetyLimit = totalSessions * 8 + 14;

  for (
    let offset = 0;
    dates.length < totalSessions && offset < safetyLimit;
    offset += 1
  ) {
    if (allowedDays.has(cursor.getUTCDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (dates.length !== totalSessions) {
    throw new BatchSchedulingError(
      'Could not calculate the complete recurring class schedule'
    );
  }
  return dates;
}

function formatTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatRecurringSchedule(
  frequencyDays: number[],
  startTime: string,
  timezone: string
): string {
  const mondayFirstOrder = [1, 2, 3, 4, 5, 6, 0];
  const days = [...frequencyDays]
    .sort(
      (a, b) => mondayFirstOrder.indexOf(a) - mondayFirstOrder.indexOf(b)
    )
    .map((day) => DAY_NAMES[day])
    .join(' & ');
  return `Every ${days} · ${formatTime(startTime)} · ${timezone}`;
}

function overlaps(
  a: { startAt: Date; endAt: Date },
  b: { startAt: Date; endAt: Date }
) {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

async function assertNoConflicts(
  proposed: Array<{
    date: Date;
    startTime: string;
    endTime: string;
    timezone: string;
  }>,
  coachId: mongoose.Types.ObjectId | string | undefined,
  studentIds: string[],
  options: SessionOption = {},
  excludeClassIds: mongoose.Types.ObjectId[] = []
): Promise<void> {
  if (proposed.length === 0) return;

  const sortedDates = proposed
    .map((item) => item.date.getTime())
    .sort((a, b) => a - b);
  const rangeStart = new Date(sortedDates[0] - 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(
    sortedDates[sortedDates.length - 1] + 24 * 60 * 60 * 1000
  );
  const scope: any[] = [];
  if (coachId) scope.push({ coach: coachId });
  if (studentIds.length > 0) scope.push({ students: { $in: studentIds } });
  if (scope.length === 0) return;

  let query = Class.find({
    ...(excludeClassIds.length > 0 ? { _id: { $nin: excludeClassIds } } : {}),
    date: { $gte: rangeStart, $lte: rangeEnd },
    status: { $in: [ClassStatus.SCHEDULED, ClassStatus.COMPLETED] },
    $or: scope,
  }).select('date startTime endTime timezone coach students');
  if (options.session) query = query.session(options.session);
  const candidates = await query.lean();

  for (const item of proposed) {
    const targetWindow = classWindow(item);
    const conflict = candidates.find((candidate: any) =>
      overlaps(classWindow(candidate), targetWindow)
    );
    if (conflict) {
      const dateLabel = item.date.toISOString().slice(0, 10);
      throw new BatchSchedulingError(
        `Schedule conflict on ${dateLabel} at ${item.startTime}. The coach or an assigned student already has a class then.`
      );
    }
  }
}

async function activeStudentIds(
  batch: IBatch,
  options: SessionOption
): Promise<string[]> {
  const ids = batch.students.map((id) => id.toString());
  if (ids.length === 0) return [];
  let query = Student.find({
    _id: { $in: ids },
    portalStatus: { $nin: ['frozen', 'expired'] },
  }).select('_id');
  if (options.session) query = query.session(options.session);
  const students = await query.lean();
  return students.map((student) => student._id.toString());
}

export async function generateRecurringClasses(
  batch: IBatch,
  createdBy: mongoose.Types.ObjectId | string,
  options: SessionOption = {}
): Promise<IClass[]> {
  if (
    !batch.automationEnabled ||
    !batch.startDate ||
    !batch.frequencyDays?.length ||
    !batch.classStartTime ||
    !batch.classDurationMinutes ||
    !batch.timezone ||
    !batch.meetingLink
  ) {
    throw new BatchSchedulingError(
      'The automated batch schedule is incomplete'
    );
  }

  const dates = buildRecurringClassDates(
    batch.startDate,
    batch.frequencyDays,
    batch.totalSessions
  );
  const endTime = addMinutesToTime(
    batch.classStartTime,
    batch.classDurationMinutes
  );
  const studentIds = await activeStudentIds(batch, options);
  const proposed = dates.map((date) => ({
    date,
    startTime: batch.classStartTime!,
    endTime,
    timezone: batch.timezone!,
  }));
  await assertNoConflicts(proposed, batch.coach, studentIds, options);

  const classPayloads = proposed.map((slot, index) => ({
    ...slot,
    students: studentIds,
    batch: batch._id,
    coach: batch.coach,
    course: batch.courseLevel,
    meetingLink: batch.meetingLink,
    meetingLinkSource: 'batch' as const,
    accessOpensMinutesBefore: batch.accessOpensMinutesBefore ?? 10,
    classType: 'regular' as const,
    status: ClassStatus.SCHEDULED,
    sessionNumber: index + 1,
    autoGenerated: true,
    createdBy,
  }));

  const classes = await Class.insertMany(classPayloads, {
    session: options.session,
  });
  batch.sessions = batch.sessions.map((item, index) => ({
    sessionNumber: item.sessionNumber,
    status: 'scheduled' as const,
    classId: classes[index]._id,
  }));
  await batch.save({ session: options.session });

  if (studentIds.length > 0) {
    await Attendance.insertMany(
      classes.flatMap((classItem) =>
        studentIds.map((studentId) => ({
          class: classItem._id,
          student: studentId,
          coach: batch.coach,
          status: AttendanceStatus.NOT_MARKED,
          attendanceConsumed: false,
        }))
      ),
      { session: options.session }
    );
  }
  return classes;
}

export async function createExtraBatchClass(
  batch: IBatch,
  input: ExtraClassInput,
  createdBy: mongoose.Types.ObjectId | string,
  options: SessionOption = {}
): Promise<IClass> {
  if (batch.status === BatchStatus.COMPLETED) {
    throw new BatchSchedulingError(
      'Extra classes cannot be added to a completed batch'
    );
  }
  const students = batch.students.map((id) => id.toString());
  const slot = {
    date: dateOnly(input.date),
    startTime: input.startTime,
    endTime: addMinutesToTime(input.startTime, input.durationMinutes),
    timezone: input.timezone,
  };
  const window = classWindow(slot);
  if (window.endAt <= new Date()) {
    throw new BatchSchedulingError('Extra class must end in the future');
  }
  let finalClassQuery = Class.findOne({
    batch: batch._id,
    classType: 'regular',
    status: { $ne: ClassStatus.CANCELLED },
  })
    .sort({ sessionNumber: -1 })
    .select('date startTime endTime timezone');
  if (options.session)
    finalClassQuery = finalClassQuery.session(options.session);
  const finalRegularClass = await finalClassQuery;
  if (
    finalRegularClass &&
    window.endAt > classWindow(finalRegularClass).endAt
  ) {
    throw new BatchSchedulingError(
      'Extra class must be scheduled before the batch course is completed'
    );
  }
  await assertNoConflicts([slot], batch.coach, students, options);

  const created = await Class.create(
    [
      {
        ...slot,
        students,
        batch: batch._id,
        coach: batch.coach,
        course: batch.courseLevel,
        meetingLink: input.meetingLink,
        meetingLinkSource: 'custom',
        accessOpensMinutesBefore: input.accessOpensMinutesBefore ?? 10,
        classType: 'extra',
        extraClassReason: input.reason,
        autoGenerated: false,
        status: ClassStatus.SCHEDULED,
        createdBy,
      },
    ],
    { session: options.session }
  );
  const classItem = created[0];

  if (students.length > 0) {
    await Attendance.insertMany(
      students.map((studentId) => ({
        class: classItem._id,
        student: studentId,
        coach: batch.coach,
        status: AttendanceStatus.NOT_MARKED,
        attendanceConsumed: false,
      })),
      { session: options.session }
    );
  }
  return classItem;
}

function futureScheduledClasses(
  batchId: string | mongoose.Types.ObjectId,
  options: SessionOption = {}
) {
  const query = Class.find({ batch: batchId, status: ClassStatus.SCHEDULED }).select(
    '_id coach date startTime endTime timezone'
  );
  if (options.session) query.session(options.session);
  return query;
}

export async function addStudentsToScheduledBatchClasses(
  batchId: string | mongoose.Types.ObjectId,
  studentIds: string[],
  options: SessionOption = {}
): Promise<void> {
  if (studentIds.length === 0) return;
  const now = new Date();
  const candidates = await futureScheduledClasses(batchId, options).lean();
  const classes = candidates.filter(
    (item: any) => classWindow(item).endAt > now
  );
  if (classes.length === 0) return;

  await Class.updateMany(
    { _id: { $in: classes.map((item) => item._id) } },
    { $addToSet: { students: { $each: studentIds } } },
    options.session ? { session: options.session } : undefined
  );
  await Attendance.bulkWrite(
    classes.flatMap((classItem: any) =>
      studentIds.map((studentId) => ({
        updateOne: {
          filter: { class: classItem._id, student: studentId },
          update: {
            $setOnInsert: {
              coach: classItem.coach,
              status: AttendanceStatus.NOT_MARKED,
              attendanceConsumed: false,
            },
          },
          upsert: true,
        },
      }))
    ),
    options.session ? { session: options.session } : undefined
  );
}

export async function assertStudentsAvailableForScheduledBatch(
  batchId: string | mongoose.Types.ObjectId,
  studentIds: string[]
): Promise<void> {
  if (studentIds.length === 0) return;
  const now = new Date();
  const classes = await futureScheduledClasses(batchId).lean();
  const futureClasses = classes.filter(
    (item: any) => classWindow(item).endAt > now
  );
  const slots = futureClasses.map((item: any) => ({
    date: item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    timezone: item.timezone,
  }));
  await assertNoConflicts(
    slots,
    undefined,
    studentIds,
    {},
    futureClasses.map((item) => item._id)
  );
}

export async function assertCoachAvailableForScheduledBatch(
  batchId: string | mongoose.Types.ObjectId,
  coachId: string | mongoose.Types.ObjectId
): Promise<void> {
  const classes = await Class.find({
    batch: batchId,
    status: ClassStatus.SCHEDULED,
  })
    .select('date startTime endTime timezone')
    .lean();
  const slots = classes.map((item: any) => ({
    date: item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    timezone: item.timezone,
  }));
  await assertNoConflicts(slots, coachId, []);
}

export async function removeStudentFromScheduledBatchClasses(
  batchId: string | mongoose.Types.ObjectId,
  studentId: string
): Promise<void> {
  const now = new Date();
  const candidates = await futureScheduledClasses(batchId).lean();
  const classIds = candidates
    .filter((item: any) => classWindow(item).endAt > now)
    .map((item) => item._id);
  if (classIds.length === 0) return;
  await Class.updateMany(
    { _id: { $in: classIds } },
    { $pull: { students: studentId } }
  );
  await Attendance.deleteMany({
    class: { $in: classIds },
    student: studentId,
    status: AttendanceStatus.NOT_MARKED,
    attendanceConsumed: false,
  });
}

export function classAccessDto(classItem: any, includeMeetingLink = false) {
  const { opensAt, startAt, closesAt } = classAccessWindow(classItem);
  return {
    _id: classItem._id.toString(),
    course: classItem.course,
    classType: classItem.classType === 'demo' ? 'trial' : classItem.classType,
    date: classItem.date,
    startTime: classItem.startTime,
    endTime: classItem.endTime,
    timezone: classItem.timezone,
    status: classItem.status,
    accessOpensMinutesBefore: classItem.accessOpensMinutesBefore ?? 10,
    accessOpensAt: opensAt.toISOString(),
    startsAt: startAt.toISOString(),
    accessClosesAt: closesAt.toISOString(),
    ...(includeMeetingLink ? { meetingLink: classItem.meetingLink } : {}),
  };
}

export async function findNextBatchClasses(
  batchIds: Array<string | mongoose.Types.ObjectId>
): Promise<Map<string, ReturnType<typeof classAccessDto>>> {
  const result = new Map<string, ReturnType<typeof classAccessDto>>();
  if (batchIds.length === 0) return result;
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const candidates = await Class.find({
    batch: { $in: batchIds },
    status: ClassStatus.SCHEDULED,
    date: { $gte: yesterday },
  })
    .sort({ date: 1, startTime: 1 })
    .select(
      'batch course classType date startTime endTime timezone status accessOpensMinutesBefore'
    )
    .lean();
  const now = new Date();
  for (const item of candidates as any[]) {
    const key = item.batch.toString();
    if (!result.has(key) && classAccessWindow(item).closesAt >= now) {
      result.set(key, classAccessDto(item, false));
    }
  }
  return result;
}

export async function findNextBatchClass(
  batchId: string | mongoose.Types.ObjectId
) {
  const results = await findNextBatchClasses([batchId]);
  return results.get(batchId.toString()) || null;
}

export async function startEligibleAutomatedBatches(
  now = new Date()
): Promise<number> {
  const batches = await Batch.find({
    automationEnabled: true,
    status: BatchStatus.UPCOMING,
  }).select('_id');
  if (batches.length === 0) return 0;
  const batchIds = batches.map((batch) => batch._id);
  const firstClasses = await Class.aggregate([
    {
      $match: {
        batch: { $in: batchIds },
        classType: 'regular',
        status: { $ne: ClassStatus.CANCELLED },
      },
    },
    { $sort: { date: 1, startTime: 1 } },
    { $group: { _id: '$batch', firstClass: { $first: '$$ROOT' } } },
  ]);
  const eligibleIds = firstClasses
    .filter((item: any) => classWindow(item.firstClass).startAt <= now)
    .map((item: any) => item._id);
  if (eligibleIds.length === 0) return 0;
  const update = await Batch.updateMany(
    { _id: { $in: eligibleIds }, status: BatchStatus.UPCOMING },
    { $set: { status: BatchStatus.ONGOING } }
  );
  if (update.modifiedCount > 0) {
    const { CacheService, CacheNamespaces } = await import('../utils/cache');
    await CacheService.deletePattern(`${CacheNamespaces.BATCH_LIST}:*`);
  }
  return update.modifiedCount;
}
