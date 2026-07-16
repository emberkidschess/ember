import { Router } from 'express';
import { getCoachReports } from '../controllers/reportController';
import { authenticate, requireAnyPermission, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Reports are an operational staff/coach workspace. Admins have dashboard
// analytics, but should not receive this staff-only report endpoint.
router.get('/coaches', authenticate, requireRole('coach', 'staff'), requireAnyPermission('view_coach_reports', 'view_students', 'schedule_classes'), (req: AuthRequest, res) => getCoachReports(req, res));

export default router;
