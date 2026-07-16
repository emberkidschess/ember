import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Class, { ClassStatus } from '../models/Class';
import Batch from '../models/Batch';
import AcademyEvent, { AcademyEventStatus, AcademyEventType } from '../models/AcademyEvent';
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

    const [totalClassesConducted, totalDemoClasses, totalTrialClasses, totalCoverUpClasses, classRecords, batchRecords, eventRecords] = await Promise.all([
      Class.countDocuments({ ...classFilter, status: ClassStatus.COMPLETED }),
      Class.countDocuments({ ...classFilter, classType: 'demo', status: ClassStatus.COMPLETED }),
      Class.countDocuments({ ...classFilter, classType: 'trial', status: ClassStatus.COMPLETED }),
      Class.countDocuments({ ...classFilter, classType: 'extra', status: ClassStatus.COMPLETED }),
      Class.find({ ...classFilter, classType: 'trial' })
        .populate('leadId', 'studentName country convertedToStudent status')
        .sort({ date: -1, startTime: -1 })
        .limit(200)
        .lean(),
      Batch.find(coach ? { coach } : {})
        .populate('coach', 'name email')
        .select('name schedule timezone courseLevel status sessions startDate completedAt coach')
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

    const trialReport = classRecords
      .filter((item: any) => !country || item.leadId?.country === country)
      .map((item: any) => ({
        _id: item._id.toString(),
        studentName: item.leadId?.studentName || 'Unknown student',
        country: item.leadId?.country,
        timezone: item.timezone,
        trialDate: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        trialStatus: item.trialResult || item.status,
        enrollmentStatus: item.leadId?.convertedToStudent ? 'enrolled' : 'pending',
      }));

    const batchIds = batchRecords.map((batch: any) => batch._id);
    const batchClasses = batchIds.length
      ? await Class.find({ batch: { $in: batchIds }, classType: 'regular' })
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
      const dailyHistory = dailyRange
        ? history.filter((item) => {
          const timestamp = new Date(item.date).getTime();
          const from = dailyRange.$gte?.getTime();
          const to = dailyRange.$lte?.getTime();
          return (from === undefined || timestamp >= from) && (to === undefined || timestamp <= to);
        })
        : [];
      const completedClasses = history.filter((item) => item.status === ClassStatus.COMPLETED).length;
      return {
        _id: batch._id.toString(),
        batchName: batch.name,
        schedule: batch.schedule,
        completionStatus: batch.status,
        completedAt: batch.completedAt,
        totalScheduledClasses: history.length,
        totalCompletedClasses: completedClasses,
        dailyClassCount: reportDay ? dailyHistory.length : 0,
        dailyClassSchedule: reportDay ? dailyHistory.map((item) => ({
          _id: item._id.toString(),
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          classType: item.classType,
          sessionNumber: item.sessionNumber,
          status: item.status,
        })) : [],
        // Kept for existing consumers; the UI intentionally renders the daily
        // schedule separately from this full course-progress history.
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
      ...classFilter,
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
          totalClassesConducted,
          totalDemoClasses,
          totalTrialClasses,
          totalMasterclassesConducted: masterclassReport.filter((event) => event.status === AcademyEventStatus.COMPLETED).length,
          totalCoverUpClasses,
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
