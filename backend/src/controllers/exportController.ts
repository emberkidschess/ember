import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Student from '../models/Student';
import Lead from '../models/Lead';
import Class from '../models/Class';
import Attendance from '../models/Attendance';
import Payment from '../models/Payment';
import { generateCSV, formatDateForExport, formatCurrencyForExport } from '../utils/export';

export const exportStudents = async (req: AuthRequest, res: Response) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    
    const headers = ['studentName', 'parentName', 'email', 'phoneNumber', 'country', 'course', 'studentStatus', 'enrollmentStatus', 'createdAt'];
    const csvData = students.map(s => ({
      studentName: s.studentName,
      parentName: s.parentName,
      email: s.email,
      phoneNumber: s.phoneNumber,
      country: s.country || '',
      course: s.course,
      studentStatus: s.studentStatus,
      enrollmentStatus: s.enrollmentStatus,
      createdAt: formatDateForExport(s.createdAt),
    }));
    
    const csv = generateCSV(csvData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=students_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export students',
    });
  }
};

export const exportLeads = async (req: AuthRequest, res: Response) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    
    const headers = ['studentName', 'parentName', 'email', 'phoneNumber', 'country', 'courseInterest', 'status', 'leadSource', 'createdAt'];
    const csvData = leads.map(l => ({
      studentName: l.studentName,
      parentName: l.parentName,
      email: l.email,
      phoneNumber: l.phoneNumber,
      country: l.country || '',
      courseInterest: l.courseInterest,
      status: l.status,
      leadSource: l.leadSource,
      createdAt: formatDateForExport(l.createdAt),
    }));
    
    const csv = generateCSV(csvData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export leads',
    });
  }
};

export const exportClasses = async (req: AuthRequest, res: Response) => {
  try {
    const classes = await Class.find()
      .populate('students', 'studentName parentName')
      .populate('coach', 'name email')
      .sort({ date: -1 });
    
    const headers = ['studentName', 'coachName', 'course', 'classType', 'date', 'startTime', 'endTime', 'status', 'createdAt'];
    const csvData = classes.flatMap((c) =>
      (c.students as any[]).map((student) => ({
        studentName: student?.studentName || '',
        coachName: (c.coach as any)?.name || '',
        course: c.course,
        classType: c.classType,
        date: formatDateForExport(c.date),
        startTime: c.startTime,
        endTime: c.endTime,
        status: c.status,
        createdAt: formatDateForExport(c.createdAt),
      }))
    );
    
    const csv = generateCSV(csvData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=classes_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting classes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export classes',
    });
  }
};

export const exportAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const attendance = await Attendance.find()
      .populate('student', 'studentName parentName')
      .populate('coach', 'name email')
      .populate('class', 'course date startTime endTime')
      .sort({ markedAt: -1 });
    
    const headers = ['studentName', 'coachName', 'course', 'date', 'startTime', 'endTime', 'status', 'markedAt'];
    const csvData = attendance.map(a => ({
      studentName: (a.student as any).studentName || '',
      coachName: (a.coach as any).name || '',
      course: (a.class as any).course || '',
      date: formatDateForExport((a.class as any).date),
      startTime: (a.class as any).startTime || '',
      endTime: (a.class as any).endTime || '',
      status: a.status,
      markedAt: formatDateForExport(a.markedAt),
    }));
    
    const csv = generateCSV(csvData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export attendance',
    });
  }
};

export const exportPayments = async (req: AuthRequest, res: Response) => {
  try {
    const payments = await Payment.find()
      .populate('student', 'studentName parentName')
      .sort({ createdAt: -1 });
    
    const headers = ['studentName', 'parentName', 'amount', 'paymentDate', 'status', 'createdAt'];
    const csvData = payments.map(p => ({
      studentName: (p.student as any).studentName || '',
      parentName: (p.student as any).parentName || '',
      amount: formatCurrencyForExport(p.amount, p.currency),
      paymentDate: p.paymentDate ? formatDateForExport(p.paymentDate) : '',
      status: p.status,
      createdAt: formatDateForExport(p.createdAt),
    }));
    
    const csv = generateCSV(csvData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payments_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export payments',
    });
  }
};
