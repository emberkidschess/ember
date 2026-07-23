import { Router } from 'express';
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  postClassNotes,
  deleteClass,
  rescheduleClass,
  cancelClass,
  getClassStats,
  getMyClasses,
  startClass,
  getClassJoinStatus,
  scheduleTrialClass,
  rescheduleTrialClass,
  markTrialResult,
  getTrialClasses,
  joinTrialClass,
} from '../controllers/classController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, requirePermission, requireAnyPermission, AuthRequest } from '../middleware/auth';
import { authenticateClient, ClientAuthRequest } from '../middleware/clientAuth';
import {
  createClassSchema,
  updateClassSchema,
  rescheduleClassSchema,
  cancelClassSchema,
  postClassNotesSchema,
  scheduleTrialClassSchema,
  rescheduleTrialClassSchema,
  markTrialResultSchema,
  validate,
} from '../utils/validation';

const router = Router();

// Specific GET paths MUST be registered before /:id, otherwise Express
// matches them as an ID (the lesson from a previous /my and /trials bug -
// applied here exhaustively to every literal path on this router).
router.get('/', authenticate, requireStaffOrAdmin, requireAnyPermission('schedule_classes', 'create_edit_class', 'assign_students_to_class', 'assign_staff_to_class', 'reschedule_class', 'cancel_class', 'post_class_notes'), (req: AuthRequest, res) => getClasses(req, res));
router.get('/stats', authenticate, requireStaffOrAdmin, requireAnyPermission('schedule_classes', 'create_edit_class', 'assign_students_to_class', 'assign_staff_to_class', 'reschedule_class', 'cancel_class', 'post_class_notes'), (req: AuthRequest, res) => getClassStats(req, res));
router.get('/my', authenticateClient, (req: ClientAuthRequest, res) => getMyClasses(req, res));
router.get('/trials', authenticate, requireStaffOrAdmin, requireAnyPermission('schedule_trial', 'mark_trial_result'), (req: AuthRequest, res) => getTrialClasses(req, res));

// Public, no-auth: the "Join Now" link a lead clicks from their trial email
router.post('/trials/:id/join', strictLimiter, (req, res) => joinTrialClass(req, res));

router.post(
  '/trials/schedule',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('schedule_trial'),
  validate(scheduleTrialClassSchema),
  (req: AuthRequest, res) => scheduleTrialClass(req, res)
);
router.post(
  '/trials/:id/result',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('mark_trial_result'),
  validate(markTrialResultSchema),
  (req: AuthRequest, res) => markTrialResult(req, res)
);
router.post(
  '/trials/:id/reschedule',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('schedule_trial'),
  validate(rescheduleTrialClassSchema),
  (req: AuthRequest, res) => rescheduleTrialClass(req, res)
);

// Time-gate polling: any authenticated staff/coach can check (read-only,
// no sensitive data) - kept above /:id since it's a literal sub-path.
router.post('/:id/start', strictLimiter, authenticate, requireStaffOrAdmin, requireAnyPermission('schedule_classes', 'create_edit_class', 'assign_staff_to_class'), (req: AuthRequest, res) => startClass(req, res));
router.get('/:id/join-status', authenticate, requireStaffOrAdmin, requireAnyPermission('schedule_classes', 'create_edit_class', 'assign_students_to_class', 'assign_staff_to_class', 'reschedule_class', 'cancel_class', 'post_class_notes', 'schedule_trial', 'mark_trial_result'), (req: AuthRequest, res) => getClassJoinStatus(req, res));

router.get('/:id', authenticate, requireStaffOrAdmin, requireAnyPermission('schedule_classes', 'create_edit_class', 'assign_students_to_class', 'assign_staff_to_class', 'reschedule_class', 'cancel_class', 'post_class_notes', 'schedule_trial', 'mark_trial_result'), (req: AuthRequest, res) => getClassById(req, res));

router.post(
  '/',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requireAnyPermission('schedule_classes', 'create_edit_class'),
  validate(createClassSchema),
  (req: AuthRequest, res) => createClass(req, res)
);
router.put(
  '/:id',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('create_edit_class'),
  validate(updateClassSchema),
  (req: AuthRequest, res) => updateClass(req, res)
);
router.patch(
  '/:id/notes',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('post_class_notes'),
  validate(postClassNotesSchema),
  (req: AuthRequest, res) => postClassNotes(req, res)
);
router.post(
  '/:id/reschedule',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('reschedule_class'),
  validate(rescheduleClassSchema),
  (req: AuthRequest, res) => rescheduleClass(req, res)
);
router.post(
  '/:id/cancel',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('cancel_class'),
  validate(cancelClassSchema),
  (req: AuthRequest, res) => cancelClass(req, res)
);
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteClass(req, res));

export default router;
