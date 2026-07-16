import { Router } from 'express';
import siteRoutes from './siteRoutes';
import testimonialRoutes from './testimonialRoutes';
import prodigyRoutes from './prodigyRoutes';
import courseRoutes from './courseRoutes';
import inquiryRoutes from './inquiryRoutes';
import roadmapRoutes from './roadmapRoutes';
import adminAuthRoutes from './adminAuthRoutes';
import staffAuthRoutes from './staffAuthRoutes';
import clientAuthRoutes from './clientAuthRoutes';
import staffRoutes from './staffRoutes';
import leadRoutes from './leadRoutes';
import studentRoutes from './studentRoutes';
import dashboardRoutes from './dashboardRoutes';
import classRoutes from './classRoutes';
import batchRoutes from './batchRoutes';
import attendanceRoutes from './attendanceRoutes';
import paymentRoutes from './paymentRoutes';
import paymentLinkRoutes from './paymentLinkRoutes';
import salaryRoutes from './salaryRoutes';
import notificationRoutes from './notificationRoutes';
import fileRoutes from './fileRoutes';
import exportRoutes from './exportRoutes';
import testRoutes from './testRoutes';
import packageRoutes from './packageRoutes';
import evaluationReportRoutes from './evaluationReportRoutes';
import academyEventRoutes from './academyEventRoutes';
import reportRoutes from './reportRoutes';
import { csrfProtection, validateCSRFToken } from '../middleware/csrf';

const router = Router();

// Apply CSRF protection to all routes
router.use(csrfProtection);

// Login requests without a session pass through; refresh/logout requests that
// carry cookies must come from a configured frontend origin.
router.use('/auth/admin', validateCSRFToken, adminAuthRoutes);
router.use('/auth/staff', validateCSRFToken, staffAuthRoutes);
router.use('/auth/client', validateCSRFToken, clientAuthRoutes);

// Apply CSRF validation to mutation routes
router.use('/dashboard', validateCSRFToken, dashboardRoutes);

router.use('/staff', validateCSRFToken, staffRoutes);

router.use('/leads', validateCSRFToken, leadRoutes);

router.use('/students', validateCSRFToken, studentRoutes);

router.use('/classes', validateCSRFToken, classRoutes);
router.use('/batches', validateCSRFToken, batchRoutes);

router.use('/attendance', validateCSRFToken, attendanceRoutes);

router.use('/payments', validateCSRFToken, paymentRoutes);

router.use('/payment-links', validateCSRFToken, paymentLinkRoutes);

router.use('/packages', validateCSRFToken, packageRoutes);

router.use('/evaluation-reports', validateCSRFToken, evaluationReportRoutes);

router.use('/events', validateCSRFToken, academyEventRoutes);

router.use('/reports', validateCSRFToken, reportRoutes);

router.use('/salary', validateCSRFToken, salaryRoutes);

router.use('/notifications', validateCSRFToken, notificationRoutes);

router.use('/files', validateCSRFToken, fileRoutes);

router.use('/export', validateCSRFToken, exportRoutes);

if (process.env.NODE_ENV !== 'production') {
  router.use('/test', validateCSRFToken, testRoutes);
}

// Public routes don't need CSRF validation
router.use('/site', siteRoutes);
router.use('/testimonials', testimonialRoutes);
router.use('/prodigies', prodigyRoutes);
router.use('/courses', courseRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/roadmap', roadmapRoutes);

export default router;
