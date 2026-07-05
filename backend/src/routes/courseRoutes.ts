import { Router } from 'express';
import { getCourses, createCourse, getCourseById, updateCourse, deleteCourse } from '../controllers/courseController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', getCourses);

router.get('/:id', authenticate, requireStaffOrAdmin, (req: AuthRequest, res) => getCourseById(req, res));

router.post('/', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => createCourse(req, res));
router.put('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => updateCourse(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deleteCourse(req, res));

export default router;
