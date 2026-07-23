import { Router } from 'express';
import { getCoachReports } from '../controllers/reportController';
import { authenticate, requireAnyPermission, requireStaffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Coaches and staff can use this workspace according to their permissions;
// admins can review the same data across every coach from the admin portal.
router.get('/coaches', authenticate, requireStaffOrAdmin, requireAnyPermission('view_coach_reports', 'view_students', 'schedule_classes'), (req: AuthRequest, res) => getCoachReports(req, res));

export default router;
