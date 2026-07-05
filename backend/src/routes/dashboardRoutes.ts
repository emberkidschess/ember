import { Router } from 'express';
import {
  getAdminDashboard,
  getStaffDashboard,
  getCoachDashboard,
  getAuditLogs,
  getSystemHealth,
} from '../controllers/dashboardController';
import { getStudentDashboard } from '../controllers/studentController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, requireCoachOrAdmin, AuthRequest } from '../middleware/auth';
import { authenticateClient, ClientAuthRequest } from '../middleware/clientAuth';

const router = Router();

router.get('/admin', authenticate, requireAdmin, (req: AuthRequest, res) => getAdminDashboard(req, res));

router.get('/staff', authenticate, requireStaffOrAdmin, (req: AuthRequest, res) => getStaffDashboard(req, res));

router.get('/student', authenticateClient, (req: ClientAuthRequest, res) => getStudentDashboard(req, res));

router.get('/coach', authenticate, requireCoachOrAdmin, (req: AuthRequest, res) => getCoachDashboard(req, res));

router.get('/audit-logs', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => getAuditLogs(req, res));

router.get('/system-health', authenticate, requireAdmin, (req: AuthRequest, res) => getSystemHealth(req, res));

export default router;
