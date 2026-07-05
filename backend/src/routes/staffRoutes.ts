import { Router } from 'express';
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  toggleStaffStatus,
  getStaffActivity,
} from '../controllers/staffController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, AuthRequest } from '../middleware/auth';
import { createStaffSchema, staffStatusSchema, updateStaffSchema, validate } from '../utils/validation';

const router = Router();

router.get('/', authenticate, requireStaffOrAdmin, (req: AuthRequest, res) => getStaff(req, res));
router.get('/:id', authenticate, requireAdmin, (req: AuthRequest, res) => getStaffById(req, res));
router.post('/', strictLimiter, authenticate, requireAdmin, validate(createStaffSchema), (req: AuthRequest, res) => createStaff(req, res));
router.put('/:id', strictLimiter, authenticate, requireAdmin, validate(updateStaffSchema), (req: AuthRequest, res) => updateStaff(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteStaff(req, res));
router.post('/:id/reset-password', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => resetStaffPassword(req, res));
router.patch('/:id/status', strictLimiter, authenticate, requireAdmin, validate(staffStatusSchema), (req: AuthRequest, res) => toggleStaffStatus(req, res));
router.get('/:id/activity', authenticate, requireAdmin, (req: AuthRequest, res) => getStaffActivity(req, res));

export default router;
