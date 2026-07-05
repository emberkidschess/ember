import { Router } from 'express';
import {
  getAttendance,
  getAttendanceById,
  getDisputedAttendance,
  joinClass,
  raiseDispute,
  resolveDispute,
  overrideAttendance,
  deleteAttendance,
  getAttendanceStats,
} from '../controllers/attendanceController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, requirePermission, requireAnyPermission, AuthRequest } from '../middleware/auth';
import { authenticateClient, ClientAuthRequest } from '../middleware/clientAuth';
import {
  joinClassSchema,
  raiseDisputeSchema,
  resolveDisputeSchema,
  overrideAttendanceSchema,
  validate,
} from '../utils/validation';

const router = Router();

// Staff/coach: list, stats, and the dispute review queue must come before
// /:id so Express doesn't match them as an attendance ID.
router.get('/', authenticate, requireStaffOrAdmin, requireAnyPermission('resolve_attendance_dispute', 'override_attendance'), (req: AuthRequest, res) => getAttendance(req, res));
router.get('/stats', authenticate, requireStaffOrAdmin, requireAnyPermission('resolve_attendance_dispute', 'override_attendance'), (req: AuthRequest, res) => getAttendanceStats(req, res));
router.get('/disputes', authenticate, requireStaffOrAdmin, requireAnyPermission('resolve_attendance_dispute', 'override_attendance'), (req: AuthRequest, res) => getDisputedAttendance(req, res));

// Student: click-tracking "Join Now" and raising a dispute on their own record
router.post(
  '/join',
  strictLimiter,
  authenticateClient,
  validate(joinClassSchema),
  (req: ClientAuthRequest, res) => joinClass(req, res)
);
router.post(
  '/:id/dispute',
  strictLimiter,
  authenticateClient,
  validate(raiseDisputeSchema),
  (req: ClientAuthRequest, res) => raiseDispute(req, res)
);

router.get('/:id', authenticate, requireStaffOrAdmin, requireAnyPermission('resolve_attendance_dispute', 'override_attendance'), (req: AuthRequest, res) => getAttendanceById(req, res));

// Coach: resolve a student-raised dispute, or directly override a record
router.patch(
  '/:id/resolve-dispute',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('resolve_attendance_dispute'),
  validate(resolveDisputeSchema),
  (req: AuthRequest, res) => resolveDispute(req, res)
);
router.patch(
  '/:id/override',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('override_attendance'),
  validate(overrideAttendanceSchema),
  (req: AuthRequest, res) => overrideAttendance(req, res)
);

router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteAttendance(req, res));

export default router;
