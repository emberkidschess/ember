import logger from './logger';

export async function notifyClassScheduled(classId: string, studentIds: string[]): Promise<void> {
  try {
    const Class = (await import('../models/Class')).default;
    const Student = (await import('../models/Student')).default;
    const emailService = (await import('../services/emailService')).default;

    const classData = await Class.findById(classId).populate('coach', 'name email').lean();
    if (!classData) return;

    const students = await Student.find({ _id: { $in: studentIds } }).select('email parentName studentName').lean();

    for (const student of students) {
      const s = student as any;
      try {
        await emailService.sendTemplatedEmail(s.email, 'class_scheduled', {
          parentName: s.parentName,
          studentName: s.studentName,
          date: new Date((classData as any).date).toLocaleDateString(),
          startTime: (classData as any).startTime,
          endTime: (classData as any).endTime,
          meetingLink: (classData as any).meetingLink,
          timezone: (classData as any).timezone,
        });
      } catch (err) {
        logger.error(`Failed to send class scheduled email to ${s.email}:`, err);
      }
    }
  } catch (error) {
    logger.error('notifyClassScheduled error:', error);
  }
}

export async function notifyClassRescheduled(classId: string, studentIds: string[], reason?: string): Promise<void> {
  try {
    const Class = (await import('../models/Class')).default;
    const Student = (await import('../models/Student')).default;
    const emailService = (await import('../services/emailService')).default;

    const classData = await Class.findById(classId).lean();
    if (!classData) return;

    const students = await Student.find({ _id: { $in: studentIds } }).select('email parentName studentName').lean();

    for (const student of students) {
      const s = student as any;
      try {
        await emailService.sendTemplatedEmail(s.email, 'class_rescheduled', {
          parentName: s.parentName,
          studentName: s.studentName,
          newDate: new Date((classData as any).date).toLocaleDateString(),
          startTime: (classData as any).startTime,
          endTime: (classData as any).endTime,
          meetingLink: (classData as any).meetingLink,
          timezone: (classData as any).timezone,
          reason: reason || 'Schedule update',
        });
      } catch (err) {
        logger.error(`Failed to send class rescheduled email to ${s.email}:`, err);
      }
    }
  } catch (error) {
    logger.error('notifyClassRescheduled error:', error);
  }
}

export async function notifyClassCancelled(classId: string, studentIds: string[], reason: string): Promise<void> {
  try {
    const Class = (await import('../models/Class')).default;
    const Student = (await import('../models/Student')).default;
    const emailService = (await import('../services/emailService')).default;

    const classData = await Class.findById(classId).lean();
    if (!classData) return;

    const students = await Student.find({ _id: { $in: studentIds } }).select('email parentName studentName').lean();

    for (const student of students) {
      const s = student as any;
      try {
        await emailService.sendTemplatedEmail(s.email, 'class_cancelled', {
          parentName: s.parentName,
          studentName: s.studentName,
          date: new Date((classData as any).date).toLocaleDateString(),
          startTime: (classData as any).startTime,
          reason,
        });
      } catch (err) {
        logger.error(`Failed to send class cancelled email to ${s.email}:`, err);
      }
    }
  } catch (error) {
    logger.error('notifyClassCancelled error:', error);
  }
}
