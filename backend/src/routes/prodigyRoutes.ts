import { Router } from 'express';
import { getProdigies, createProdigy, getProdigyById, updateProdigy, deleteProdigy } from '../controllers/prodigyController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', getProdigies);

router.get('/:id', authenticate, requireStaffOrAdmin, (req: AuthRequest, res) => getProdigyById(req, res));

router.post('/', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => createProdigy(req, res));
router.put('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => updateProdigy(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteProdigy(req, res));

export default router;
