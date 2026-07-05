import { Router } from 'express';
import { getRoadmaps, createRoadmap, getRoadmapById, updateRoadmap, deleteRoadmap } from '../controllers/roadmapController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', getRoadmaps);

router.get('/:id', authenticate, requireStaffOrAdmin, (req: AuthRequest, res) => getRoadmapById(req, res));

router.post('/', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => createRoadmap(req, res));
router.put('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => updateRoadmap(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteRoadmap(req, res));

export default router;
