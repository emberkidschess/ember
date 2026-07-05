import { Request, Response } from 'express';
import EvaluationReport from '../models/EvaluationReport';
import Package from '../models/Package';
import { AuthRequest } from '../middleware/auth';
import { ClientAuthRequest } from '../middleware/clientAuth';
import AuditLog, { AuditAction, AuditEntityType } from '../models/AuditLog';
import { validateStudent, validatePackage, validateStaff } from '../utils/foreignKeys';
import { sendNotification } from '../utils/notificationProcessor';
import { NotificationType, NotificationChannel } from '../models/Notification';
import Staff, { StaffRole, StaffStatus } from '../models/Staff';
import { primaryFrontendUrl } from '../utils/frontendUrl';

export const getEvaluationReports = async (req: AuthRequest, res: Response) => {
  try {
    const { student, package: packageId, coach, recommendedNextLevel } = req.query;
    
    const filter: any = {};
    
    if (student) filter.student = student;
    if (packageId) filter.package = packageId;
    if (coach) filter.coach = coach;
    if (recommendedNextLevel) filter.recommendedNextLevel = recommendedNextLevel;

    const reports = await EvaluationReport.find(filter)
      .populate('student', 'studentName parentName email phone')
      .populate('package', 'packageType courseLevel status')
      .populate('coach', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching evaluation reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evaluation reports',
    });
  }
};

export const getEvaluationReportById = async (req: AuthRequest, res: Response) => {
  try {
    const report = await EvaluationReport.findById(req.params.id)
      .populate('student', 'studentName parentName email phone')
      .populate('package', 'packageType courseLevel status')
      .populate('coach', 'name email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation report not found',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error fetching evaluation report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evaluation report',
    });
  }
};

export const createEvaluationReport = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    await validateStudent(req.body.student);
    await validatePackage(req.body.package);
    await validateStaff(req.body.coach);

    const coach = await Staff.findOne({
      _id: req.body.coach,
      role: StaffRole.COACH,
      status: StaffStatus.ACTIVE,
    });
    if (!coach) {
      return res.status(400).json({
        success: false,
        error: 'The report coach must be an active coach',
      });
    }
    if (req.user?.role === StaffRole.COACH && req.user.userId !== coach._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Coaches can only create reports under their own profile',
      });
    }

    const packageData = await Package.findById(req.body.package);
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: 'Package not found',
      });
    }

    if (packageData.student.toString() !== req.body.student.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Package does not belong to this student',
      });
    }

    // Check if package is completed before creating evaluation report
    const { PackageStatus } = await import('../models/Package');
    if (packageData.status !== PackageStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: 'Evaluation reports can only be created for completed packages',
      });
    }

    // Check for duplicate evaluation report for this package
    const existingReport = await EvaluationReport.findOne({ package: req.body.package });
    if (existingReport) {
      return res.status(400).json({
        success: false,
        error: 'An evaluation report already exists for this package',
      });
    }

    const report = await EvaluationReport.create({
      ...req.body,
      createdBy: req.user?.userId,
    });

    await AuditLog.create({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userName: req.user?.email || 'Unknown',
      userRole: req.user?.role || 'unknown',
      action: AuditAction.CREATE,
      entityType: AuditEntityType.EVALUATION_REPORT,
      entityId: report._id,
      entityName: `Evaluation report for package`,
      ipAddress,
      userAgent,
      success: true,
    });

    res.status(201).json({
      success: true,
      data: report,
      message: 'Evaluation report created successfully',
    });
  } catch (error) {
    console.error('Error creating evaluation report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create evaluation report',
    });
  }
};

export const updateEvaluationReport = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const existingReport = await EvaluationReport.findById(req.params.id);
    if (!existingReport) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation report not found',
      });
    }
    if (existingReport.isPublished) {
      return res.status(400).json({
        success: false,
        error: 'Published report cards are read-only',
      });
    }

    const report = await EvaluationReport.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation report not found',
      });
    }

    await AuditLog.create({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userName: req.user?.email || 'Unknown',
      userRole: req.user?.role || 'unknown',
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.EVALUATION_REPORT,
      entityId: report._id,
      entityName: `Evaluation report for package`,
      details: req.body,
      ipAddress,
      userAgent,
      success: true,
    });

    res.json({
      success: true,
      data: report,
      message: 'Evaluation report updated successfully',
    });
  } catch (error) {
    console.error('Error updating evaluation report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update evaluation report',
    });
  }
};

export const deleteEvaluationReport = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const report = await EvaluationReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation report not found',
      });
    }

    if (report.isPublished) {
      return res.status(409).json({
        success: false,
        error: 'Published report cards are academic records and cannot be deleted',
      });
    }
    await report.deleteOne();

    await AuditLog.create({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userName: req.user?.email || 'Unknown',
      userRole: req.user?.role || 'unknown',
      action: AuditAction.DELETE,
      entityType: AuditEntityType.EVALUATION_REPORT,
      entityId: report._id,
      entityName: `Evaluation report for package`,
      ipAddress,
      userAgent,
      success: true,
    });

    res.json({
      success: true,
      message: 'Evaluation report deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting evaluation report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete evaluation report',
    });
  }
};

export const publishEvaluationReport = async (req: AuthRequest, res: Response) => {
  try {
    const ipAddress = req.ipAddress || 'unknown';
    const userAgent = req.userAgent || 'unknown';

    const report = await EvaluationReport.findById(req.params.id)
      .populate('student', 'studentName parentName email phoneNumber')
      .populate('coach', 'name');

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation report not found',
      });
    }

    if (report.isPublished) {
      return res.status(400).json({
        success: false,
        error: 'This report card has already been published',
      });
    }

    report.isPublished = true;
    report.publishedAt = new Date();
    await report.save();

    const student = report.student as any;
    const coach = report.coach as any;

    try {
      const data = {
        studentName: student?.studentName,
        coachName: coach?.name || 'Your coach',
        loginUrl: `${primaryFrontendUrl()}/student/login`,
      };
      await sendNotification(student._id.toString(), NotificationType.REPORT_CARD_PUBLISHED, NotificationChannel.EMAIL, { data });
      await sendNotification(student._id.toString(), NotificationType.REPORT_CARD_PUBLISHED, NotificationChannel.WHATSAPP, { data });
    } catch (notifyError) {
      console.error('Failed to send report-card-published notifications:', notifyError);
    }

    await AuditLog.create({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userName: req.user?.email || 'Unknown',
      userRole: req.user?.role || 'unknown',
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.EVALUATION_REPORT,
      entityId: report._id,
      entityName: `Report card published for ${student?.studentName}`,
      ipAddress,
      userAgent,
      success: true,
    });

    res.json({
      success: true,
      data: report,
      message: 'Report card published successfully',
    });
  } catch (error) {
    console.error('Error publishing evaluation report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish report card',
    });
  }
};

export const getStudentEvaluationReports = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const reports = await EvaluationReport.find({ student: studentId })
      .populate('package', 'packageType courseLevel status')
      .populate('coach', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching student evaluation reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student evaluation reports',
    });
  }
};

export const getPackageEvaluationReport = async (req: AuthRequest, res: Response) => {
  try {
    const { packageId } = req.params;

    const report = await EvaluationReport.findOne({ package: packageId })
      .populate('student', 'studentName parentName email phone')
      .populate('package', 'packageType courseLevel status')
      .populate('coach', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation report not found for this package',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error fetching package evaluation report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch package evaluation report',
    });
  }
};

export const getMyReports = async (req: ClientAuthRequest, res: Response) => {
  try {
    const studentProfileId = req.client?.profileId;
    
    if (!studentProfileId) {
      return res.status(401).json({
        success: false,
        error: 'Student profile ID not found in token',
      });
    }

    const reports = await EvaluationReport.find({ student: studentProfileId, isPublished: true })
      .populate('package', 'packageType courseLevel status')
      .populate('coach', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching student reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your reports',
    });
  }
};
