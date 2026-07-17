import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Class, { ClassStatus } from '../models/Class';
import Batch, { BatchStatus } from '../models/Batch';
import AcademyEvent, { AcademyEventStatus, AcademyEventType } from '../models/AcademyEvent';
import Lead from '../models/Lead';
import Student from '../models/Student';
import { effectiveEventStatus } from '../services/academyEventService';
import { sanitizeQueryParam } from '../utils/validation';

function dateFilter(dateFrom: unknown, dateTo: unknown, day?: unknown) {
  const filter: Record<string, Date> = {};
  const selectedDay = sanitizeQueryParam(day);
  if (selectedDay) {
    const start = new Date(`${selectedDay}T00:00:00.000Z`);
    if (!Number.isNaN(start.getTime())) {
      filter.$gte = start;
      filter.$lte = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      return filter;
    }
  }
  const from = sanitizeQueryParam(dateFrom);
  const to = sanitizeQueryParam(dateTo);
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(`${to}T23:59:59.999Z`);
  return Object.keys(filter).length ? filter : undefined;
}

function reportCoach(req: AuthRequest) {
  if (req.user?.role === 'coach') return req.user.userId;
  return sanitizeQueryParam(req.query.coach) || undefined;
}

export const getCoachReports = async (req: AuthRequest, res: Response) => {
  try {
    const coach = reportCoach(req);
    const reportDay = sanitizeQueryParam(req.query.day);
    const dateRange = dateFilter(req.query.dateFrom, req.query.dateTo);
    const dailyRange = dateFilter(undefined, undefined, reportDay);
    const timezone = sanitizeQueryParam(req.query.timezone);
    const country = sanitizeQueryParam(req.query.country);
    const classFilter: any = {
      ...(coach ? { coach } : {}),
      ...(dateRange ? { date: dateRange } : {}),
      ...(timezone ? { timezone } : {}),
    };

    // Class records do not store a country directly. Resolve the selected
    // country once so the summary counts, trial table, and cover-up
    // report all honour the same scope instead of silently showing all
    // countries while only the event table is filtered.
    const countryClassFilter: Record<string, any> = {};
    let countryStudentIds: unknown[] = [];
    if (country) {
      const [countryStudents, countryLeads] = await Promise.all([
        Student.find({ country }).select('_id').lean(),
        Lead.find({ country }).select('_id').lean(),
      ]);
      countryStudentIds = countryStudents.map((item) => item._id);
      countryClassFilter.$or = [
        { students: { $in: countryStudentIds } },
        { leadId: { $in: countryLeads.map((item) => item._id) } },
      ];
    }
    const scopedClassFilter = { ...classFilter, ...countryClassFilter };
    const batchQueryFilter: Record<string, any> = {
      ...(coach ? { coach } : {}),
      ...(country ? { students: { $in: countryStudentIds } } : {}),
    };
    const completedBatchFilter = {
      ...batchQueryFilter,
      status: BatchStatus.COMPLETED,
      ...(dateRange ? { completedAt: dateRange } : {}),
    };

    const [totalRegularClassesConducted, totalTrialClasses, totalCoverUpClasses, totalCompletedBatches, trialRecords, batchRecords, eventRecords] = await Promise.all([
      // “Classes conducted” means recurring batch sessions. Trial (including
      // legacy records once labelled demo), extra/cover-up, and masterclass
      // activity are intentionally reported as separate operational categories.
      Class.countDocuments({ ...scopedClassFilter, classType: 'regular', status: ClassStatus.COMPLETED }),
      Class.countDocuments({ ...scopedClassFilter, classType: { $in: ['trial', 'demo'] }, status: ClassStatus.COMPLETED }),
      Class.countDocuments({ ...scopedClassFilter, classType: 'extra', status: ClassStatus.COMPLETED }),
      Batch.countDocuments(completedBatchFilter),
      Class.find({ ...scopedClassFilter, classType: { $in: ['trial', 'demo'] } })
        .populate('leadId', 'studentName country convertedToStudent status')
        .populate('students', 'studentName country')
        .sort({ date: -1, startTime: -1 })
        .limit(200)
        .lean(),
      Batch.find(batchQueryFilter)
        .populate('coach', 'name email')
        .select('name schedule timezone courseLevel status sessions totalSessions sessionsCompleted startDate completedAt coach')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      AcademyEvent.find({
        type: AcademyEventType.MASTERCLASS,
        ...(coach ? { coach } : {}),
        ...(dateRange ? { date: dateRange } : {}),
        ...(timezone ? { timezone } : {}),
        ...(country ? { country } : {}),
      })
        .populate('coach', 'name email')
        .sort({ date: -1, startTime: -1 })
        .limit(200)
        .lean(),
    ]);

    const trialReport = trialRecords.map((item: any) => {
      const lead = item.leadId;
      const student = Array.isArray(item.students) ? item.students[0] : undefined;
      return {
        _id: item._id.toString(),
        studentName: lead?.studentName || student?.studentName || 'Unknown student',
        country: lead?.country || student?.country,
        timezone: item.timezone,
        trialDate: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
        trialStatus: item.trialResult || item.status,
        enrollmentStatus: lead?.convertedToStudent ? 'enrolled' : lead ? 'pending' : '—',
      };
    });

    const batchIds = batchRecords.map((batch: any) => batch._id);
    const batchClasses = batchIds.length && dailyRange
      ? await Class.find({ batch: { $in: batchIds }, classType: 'regular', date: dailyRange })
        .select('batch date startTime endTime status classType sessionNumber')
        .sort({ date: 1, startTime: 1 })
        .lean()
      : [];
    const classesByBatch = new Map<string, any[]>();
    for (const item of batchClasses as any[]) {
      const key = item.batch.toString();
      const current = classesByBatch.get(key) || [];
      current.push(item);
      classesByBatch.set(key, current);
    }

    const batchReport = batchRecords.map((batch: any) => {
      const history = classesByBatch.get(batch._id.toString()) || [];
      return {
        _id: batch._id.toString(),
        batchName: batch.name,
        schedule: batch.schedule,
        completionStatus: batch.status,
        completedAt: batch.completedAt,
        totalScheduledClasses: batch.totalSessions || 0,
        totalCompletedClasses: batch.sessionsCompleted || 0,
        dailyClassCount: reportDay ? history.length : 0,
        dailyClassSchedule: reportDay ? history.map((item) => ({
          _id: item._id.toString(),
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          classType: item.classType,
          sessionNumber: item.sessionNumber,
          status: item.status,
        })) : [],
        // This is intentionally the selected day's history only. The full
        // course progress is represented by the counters above.
        classCompletionHistory: history.map((item) => ({
          _id: item._id.toString(),
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          classType: item.classType,
          sessionNumber: item.sessionNumber,
          status: item.status,
        })),
      };
    });

    const masterclassReport = eventRecords
      .filter((event: any) => !country || event.country === country)
      .map((event: any) => ({
        _id: event._id.toString(),
        masterclassName: event.name,
        date: event.date,
        time: event.startTime,
        country: event.country,
        timezone: event.timezone,
        status: effectiveEventStatus(event),
      }));

    const coverUpClasses = await Class.find({
      ...scopedClassFilter,
      classType: 'extra',
    })
      .populate('batch', 'name')
      .populate('coach', 'name email')
      .sort({ date: -1, startTime: -1 })
      .limit(200)
      .lean();
    const coverUpReport = coverUpClasses.map((item: any) => ({
      _id: item._id.toString(),
      batchName: item.batch?.name || 'Unassigned',
      assignedCoach: item.coach?.name || 'Unassigned',
      date: item.date,
      startTime: item.startTime,
      status: item.status,
      reason: item.extraClassReason,
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalRegularClassesConducted,
          totalTrialClasses,
          totalMasterclassesConducted: masterclassReport.filter((event) => event.status === AcademyEventStatus.COMPLETED).length,
          totalCoverUpClasses,
          totalCompletedBatches,
        },
        studentTrialReport: trialReport,
        batchReport,
        masterclassReport,
        coverUpReport,
      },
    });
  } catch (error) {
    console.error('Error fetching coach reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch coach reports' });
  }
};
