import { Router } from 'express';
import { createInquiry, getInquiries, getInquiryById, updateInquiry, deleteInquiry } from '../controllers/inquiryController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, AuthRequest } from '../middleware/auth';
import { updateInquirySchema, validate } from '../utils/validation';

const router = Router();

router.post('/', strictLimiter, createInquiry);

router.get('/', authenticate, requireStaffOrAdmin, (req: AuthRequest, res) => getInquiries(req, res));
router.get('/:id', authenticate, requireStaffOrAdmin, (req: AuthRequest, res) => getInquiryById(req, res));

router.put('/:id', strictLimiter, authenticate, requireAdmin, validate(updateInquirySchema), (req: AuthRequest, res) => updateInquiry(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteInquiry(req, res));

export default router;
