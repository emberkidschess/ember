import { Router } from 'express';
import {
  getCoachSalary,
  getAllCoachesSalary,
} from '../controllers/salaryController';
import { authenticate, requireAdmin, requireCoachOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/coach', authenticate, requireCoachOrAdmin, (req: AuthRequest, res) => getCoachSalary(req, res));

router.get('/all', authenticate, requireAdmin, (req: AuthRequest, res) => getAllCoachesSalary(req, res));

export default router;
