import { Router } from 'express';
import { getTestimonials, createTestimonial, getTestimonialById, updateTestimonial, deleteTestimonial } from '../controllers/testimonialController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', getTestimonials);

router.get('/:id', authenticate, requireStaffOrAdmin, (req: AuthRequest, res) => getTestimonialById(req, res));

router.post('/', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => createTestimonial(req, res));
router.put('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => updateTestimonial(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteTestimonial(req, res));

export default router;
