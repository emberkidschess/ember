import { Router } from 'express';
import {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats,
} from '../controllers/paymentController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { createPaymentSchema, updatePaymentSchema, validate } from '../utils/validation';

const router = Router();

router.get('/', authenticate, requireAdmin, (req: AuthRequest, res) => getPayments(req, res));
router.get('/stats', authenticate, requireAdmin, (req: AuthRequest, res) => getPaymentStats(req, res));
router.get('/:id', authenticate, requireAdmin, (req: AuthRequest, res) => getPaymentById(req, res));

router.post('/', strictLimiter, authenticate, requireAdmin, validate(createPaymentSchema), (req: AuthRequest, res) => createPayment(req, res));
router.put('/:id', strictLimiter, authenticate, requireAdmin, validate(updatePaymentSchema), (req: AuthRequest, res) => updatePayment(req, res));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => deletePayment(req, res));

export default router;
