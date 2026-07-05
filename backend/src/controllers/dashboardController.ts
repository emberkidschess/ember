import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Staff, { StaffRole, StaffStatus } from '../models/Staff';
import Lead from '../models/Lead';
import Student, { StudentStatus, EnrollmentStatus } from '../models/Student';
import AuditLog, { AuditAction } from '../models/AuditLog';
import { Course } from '../models/Course';
import { Inquiry } from '../models/Inquiry';
import Package from '../models/Package';
import Payment, { PaymentStatus } from '../models/Payment';
import Class from '../models/Class';
import Batch from '../models/Batch';
import Attendance from '../models/Attendance';
import Notification from '../models/Notification';
import { CacheService, generateCacheKey, CacheNamespaces } from '../utils/cache';

export const getAdminDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = generateCacheKey(CacheNamespaces.DASHBOARD_STATS, 'admin');
    
    // Try to get from cache first
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalLeads,
      allLeads,
      newLeadsToday,
      totalStudents,
      activeStudents,
      totalStaff,
      activeStaff,
      totalCourses,
      totalInquiries,
      newInquiriesToday,
      totalTrialBookings,
      newTrialBookingsToday,
      totalPackages,
      activePackages,
      completedPackages,
      totalPackagePurchases,
      paidPackagePurchases,
      convertedLeads,
      leadsByStatus,
      leadsBySource,
      studentsByStatus,
      studentsByEnrollment,
      packagesByStatus,
      packagesByLevel,
      purchasesByStatus,
      packageRevenueResult,
      pendingPackageRevenueResult,
      todayClasses,
      studentsWaitingForPortal,
      recentNotifications,
    ] = await Promise.all([
      Lead.countDocuments({ convertedToStudent: { $ne: true } }),
      Lead.countDocuments(),
      Lead.countDocuments({
        convertedToStudent: { $ne: true },
        createdAt: { $gte: today },
      }),
      Student.countDocuments(),
      Student.countDocuments({ studentStatus: StudentStatus.ACTIVE }),
      Staff.countDocuments(),
      Staff.countDocuments({ status: StaffStatus.ACTIVE }),
      Course.countDocuments(),
      Inquiry.countDocuments(),
      Inquiry.countDocuments({
        createdAt: { $gte: today },
      }),
      Class.countDocuments({ classType: 'trial' }),
      Class.countDocuments({
        classType: 'trial',
        createdAt: { $gte: today },
      }),
      Package.countDocuments(),
      Package.countDocuments({ status: 'active' }),
      Package.countDocuments({ status: 'completed' }),
      Payment.countDocuments(),
      Payment.countDocuments({ status: PaymentStatus.PAID }),
      Lead.countDocuments({ status: 'converted' }),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.aggregate([{ $group: { _id: '$leadSource', count: { $sum: 1 } } }]),
      Student.aggregate([{ $group: { _id: '$studentStatus', count: { $sum: 1 } } }]),
      Student.aggregate([{ $group: { _id: '$enrollmentStatus', count: { $sum: 1 } } }]),
      Package.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Package.aggregate([{ $group: { _id: '$courseLevel', count: { $sum: 1 } } }]),
      Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { status: PaymentStatus.PAID } },
        { $group: { _id: '$currency', total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: { $in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] } } },
        { $group: { _id: '$currency', total: { $sum: '$amount' } } },
      ]),
      Class.countDocuments({
        date: { $gte: today, $lte: endOfToday },
        status: 'scheduled',
      }),
      Student.countDocuments({ portalStatus: 'expired' }),
      Notification.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('recipient', 'studentName parentName email'),
    ]);

    const leadConversionRate = allLeads > 0 ? ((convertedLeads / allLeads) * 100).toFixed(2) : '0';
    const totalPackageRevenueByCurrency = Object.fromEntries(
      packageRevenueResult.map((item) => [item._id, item.total])
    );
    const pendingPackageRevenueByCurrency = Object.fromEntries(
      pendingPackageRevenueResult.map((item) => [item._id, item.total])
    );

    const [packagesNearingCompletionAdmin, recentActivities, recentLeads, recentStudents] = await Promise.all([
      Package.find({
        status: 'active',
        remainingClasses: { $lte: 3 },
      })
        .populate('student', 'studentName parentName email phone')
        .populate('previousPackageId', 'packageType courseLevel')
        .select('student previousPackageId remainingClasses packageType courseLevel status')
        .sort({ remainingClasses: 1 })
        .limit(20),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('adminId', 'name email')
        .populate('staffId', 'name email')
        .populate('studentId', 'studentName parentName email')
        .select('action entityType entityName createdAt adminId staffId studentId success'),
      Lead.find({ convertedToStudent: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('assignedTo', 'name email')
        .select('studentName parentName email phoneNumber courseInterest status assignedTo createdAt'),
      Student.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('assignedStaff', 'name email')
        .select('studentName parentName email course studentStatus enrollmentStatus assignedStaff createdAt'),
    ]);

    const systemHealth = {
      database: 'healthy',
      api: 'healthy',
      lastBackup: 'not_configured',
    };

    const dashboardData = {
      overview: {
        totalLeads,
        newLeadsToday,
        totalStudents,
        activeStudents,
        totalStaff,
        activeStaff,
        totalCourses,
        totalInquiries,
        newInquiriesToday,
        totalTrialBookings,
        newTrialBookingsToday,
        leadConversionRate,
        totalPackages,
        activePackages,
        completedPackages,
        totalPackagePurchases,
        paidPackagePurchases,
        totalPackageRevenueByCurrency,
        pendingPackageRevenueByCurrency,
        todayClasses,
        studentsWaitingForPortal,
        recentNotificationsCount: recentNotifications.length,
      },
      statistics: {
        leadsByStatus,
        leadsBySource,
        studentsByStatus,
        studentsByEnrollment,
        packagesByStatus,
        packagesByLevel,
        purchasesByStatus,
      },
      recentActivities,
      recentLeads,
      recentStudents,
      recentNotifications,
      packagesNearingCompletion: packagesNearingCompletionAdmin,
      systemHealth,
    };

    // Cache the result for 5 minutes (300 seconds)
    await CacheService.set(cacheKey, dashboardData, 300);

    res.json({
      success: true,
      data: dashboardData,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin dashboard data',
    });
  }
};

export const getStaffDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalLeads,
      newLeadsToday,
      totalStudents,
      activeStudents,
      recentLeads,
      recentStudents,
    ] = await Promise.all([
      Lead.countDocuments({ convertedToStudent: { $ne: true } }),
      Lead.countDocuments({
        convertedToStudent: { $ne: true },
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Student.countDocuments(),
      Student.countDocuments({ studentStatus: StudentStatus.ACTIVE }),
      Lead.find({ convertedToStudent: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('assignedTo', 'name email')
        .select('studentName parentName email phoneNumber status assignedTo createdAt'),
      Student.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('assignedStaff', 'name email')
        .select('studentName parentName email studentStatus enrollmentStatus assignedStaff createdAt'),
    ]);

    const leadsByStatus = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const studentsByStatus = await Student.aggregate([
      { $group: { _id: '$studentStatus', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalLeads,
          newLeadsToday,
          totalStudents,
          activeStudents,
        },
        statistics: {
          leadsByStatus,
          studentsByStatus,
        },
        recentLeads,
        recentStudents,
      },
    });
  } catch (error) {
    console.error('Error fetching staff dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff dashboard data',
    });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { action, entityType, userId, dateFrom, dateTo, limit = 50 } = req.query;
    
    const filter: any = {};

    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    // AuditLog stores the actor under adminId/staffId/studentId depending
    // on role (see buildAuditLogData) - a generic userId filter would
    // silently match nothing for the vast majority of entries, so match
    // against whichever field is actually populated for a given actor.
    if (userId) {
      filter.$or = [{ adminId: userId }, { staffId: userId }, { studentId: userId }, { userId }];
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo as string);
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
    });
  }
};

export const getSystemHealth = async (req: AuthRequest, res: Response) => {
  try {
    const dbStatus = await Staff.countDocuments().then(() => 'healthy').catch(() => 'unhealthy');
    
    const totalUsers = await Staff.countDocuments();
    const totalLogs = await AuditLog.countDocuments();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      success: true,
      data: {
        database: dbStatus,
        api: 'healthy',
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        memory: {
          used: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        },
        statistics: {
          totalUsers,
          totalLogs,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health',
    });
  }
};

// getStudentDashboard lives in studentController.ts (co-located with
// freeze/unfreeze/extendPortal - the rest of student-account management).
// A parallel, less-complete copy used to live here too (missing
// portalStatus exposure and NOT_MARKED attendance filtering); dashboardRoutes.ts
// now imports the canonical version instead of duplicating the logic.

export const getCoachDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const coachId = req.user?.userId;

    if (!coachId) {
      return res.status(400).json({
        success: false,
        error: 'Coach ID is required',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const todayClasses = await Class.find({
      coach: coachId,
      date: { $gte: today, $lte: endOfToday },
      status: 'scheduled',
    })
      .populate('students', 'studentName parentName email phone')
      .sort({ startTime: 1 });

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const upcomingClasses = await Class.find({
      coach: coachId,
      status: 'scheduled',
      date: { $gte: today, $lte: endOfWeek },
    })
      .populate('students', 'studentName parentName email phone currentPackageId')
      .sort({ date: 1, startTime: 1 })
      .limit(20);

    const coachStudents = await Student.find({
      assignedStaff: coachId,
      currentPackageId: { $ne: null },
    })
      .populate('currentPackageId', 'packageType courseLevel status remainingClasses completedClasses')
      .select('studentName parentName email phone currentPackageId assignedStaff')
      .sort({ createdAt: -1 });

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const completedClassesThisMonth = await Class.countDocuments({
      coach: coachId,
      status: 'completed',
      date: { $gte: startOfMonth },
    });

    const coachStudentIds = coachStudents.map((s: any) => s._id);
    const packagesNearingCompletion = await Package.find({
      status: 'active',
      remainingClasses: { $lte: 3 },
      student: { $in: coachStudentIds },
    })
      .populate('student', 'studentName parentName email phone')
      .sort({ remainingClasses: 1 });

    res.json({
      success: true,
      data: {
        overview: {
          todayClassesCount: todayClasses.length,
          upcomingClassesCount: upcomingClasses.length,
          coachStudentsCount: coachStudents.length,
          completedClassesThisMonth,
          packagesNearingCompletionCount: packagesNearingCompletion.length,
        },
        todayClasses,
        upcomingClasses,
        coachStudents,
        packagesNearingCompletion,
      },
    });
  } catch (error) {
    console.error('Error fetching coach dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coach dashboard data',
    });
  }
};
