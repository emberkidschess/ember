import { Router } from 'express';
import {
  exportStudents,
  exportLeads,
  exportClasses,
  exportAttendance,
  exportPayments,
} from '../controllers/exportController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/students', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => exportStudents(req, res));
router.get('/leads', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => exportLeads(req, res));
router.get('/classes', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => exportClasses(req, res));
router.get('/attendance', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => exportAttendance(req, res));
router.get('/payments', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => exportPayments(req, res));

export default router;
