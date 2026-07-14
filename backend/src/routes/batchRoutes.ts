import { Router } from 'express';
import {
  getBatches,
  getBatchHistory,
  getBatchById,
  createBatch,
  updateBatch,
  renameBatch,
  addStudentsToBatch,
  removeStudentFromBatch,
  updateBatchStatus,
  createExtraClass,
  deleteBatch,
} from '../controllers/batchController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, requirePermission, requireAnyPermission, AuthRequest } from '../middleware/auth';
import {
  createBatchSchema,
  updateBatchSchema,
  renameBatchSchema,
  addStudentsToBatchSchema,
  updateBatchStatusSchema,
  createExtraClassSchema,
  validate,
} from '../utils/validation';

const router = Router();

router.get('/', authenticate, requireStaffOrAdmin, requireAnyPermission('schedule_classes', 'create_edit_class', 'assign_students_to_class', 'assign_staff_to_class', 'enroll_student'), (req: AuthRequest, res) => getBatches(req, res));
router.get('/history', authenticate, requireStaffOrAdmin, requireAnyPermission('schedule_classes', 'create_edit_class', 'assign_students_to_class', 'assign_staff_to_class', 'enroll_student'), (req: AuthRequest, res) => getBatchHistory(req, res));
router.get('/:id', authenticate, requireStaffOrAdmin, requireAnyPermission('schedule_classes', 'create_edit_class', 'assign_students_to_class', 'assign_staff_to_class', 'enroll_student'), (req: AuthRequest, res) => getBatchById(req, res));

router.post(
  '/',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requireAnyPermission('schedule_classes', 'create_edit_class'),
  validate(createBatchSchema),
  (req: AuthRequest, res) => createBatch(req, res)
);

router.put(
  '/:id',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('create_edit_class'),
  validate(updateBatchSchema),
  (req: AuthRequest, res) => updateBatch(req, res)
);

router.patch(
  '/:id/rename',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('create_edit_class'),
  validate(renameBatchSchema),
  (req: AuthRequest, res) => renameBatch(req, res)
);

router.post(
  '/:id/extra-classes',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requireAnyPermission('schedule_classes', 'create_edit_class'),
  validate(createExtraClassSchema),
  (req: AuthRequest, res) => createExtraClass(req, res)
);

router.post(
  '/:id/students',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('assign_students_to_class'),
  validate(addStudentsToBatchSchema),
  (req: AuthRequest, res) => addStudentsToBatch(req, res)
);

router.delete(
  '/:id/students/:studentId',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('assign_students_to_class'),
  (req: AuthRequest, res) => removeStudentFromBatch(req, res)
);

router.patch(
  '/:id/status',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('create_edit_class'),
  validate(updateBatchStatusSchema),
  (req: AuthRequest, res) => updateBatchStatus(req, res)
);

router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteBatch(req, res));

export default router;
