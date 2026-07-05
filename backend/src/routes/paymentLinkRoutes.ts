import { Router } from 'express';
import {
  getPaymentLinks,
  getPendingActivations,
  getPaymentLinkById,
  getPaymentLinkPublic,
  createPaymentLink,
  updatePaymentLink,
  deletePaymentLink,
  sendPaymentLink,
  markPaymentReceivedManually,
  activatePackage,
  cancelPaymentLink,
  getPaymentLinkStats,
} from '../controllers/paymentLinkController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, requirePermission, requireAnyPermission, AuthRequest } from '../middleware/auth';
import {
  createPaymentLinkSchema,
  updatePaymentLinkSchema,
  sendPaymentLinkSchema,
  markPaymentReceivedSchema,
  activatePackageSchema,
  validate,
} from '../utils/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Public route for payment page access (no authentication required)
// Uses DTO pattern to expose only safe, necessary fields
router.get('/public/:id', asyncHandler((req: AuthRequest, res) => getPaymentLinkPublic(req, res)));

router.get('/', authenticate, requireStaffOrAdmin, requireAnyPermission('view_payment_history', 'generate_payment_link', 'send_payment_link', 'mark_payment_received', 'enroll_student'), asyncHandler((req: AuthRequest, res) => getPaymentLinks(req, res)));
router.get('/pending-activations', authenticate, requireStaffOrAdmin, requireAnyPermission('view_payment_history', 'mark_payment_received', 'enroll_student'), asyncHandler((req: AuthRequest, res) => getPendingActivations(req, res)));
router.get('/stats', authenticate, requireAdmin, asyncHandler((req: AuthRequest, res) => getPaymentLinkStats(req, res)));
router.get('/:id', authenticate, requireStaffOrAdmin, requireAnyPermission('view_payment_history', 'generate_payment_link', 'send_payment_link', 'mark_payment_received', 'enroll_student'), asyncHandler((req: AuthRequest, res) => getPaymentLinkById(req, res)));

router.post(
  '/',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('generate_payment_link'),
  validate(createPaymentLinkSchema),
  asyncHandler((req: AuthRequest, res) => createPaymentLink(req, res))
);
router.put('/:id', strictLimiter, authenticate, requireAdmin, validate(updatePaymentLinkSchema), asyncHandler((req: AuthRequest, res) => updatePaymentLink(req, res)));
router.delete('/:id', strictLimiter, authenticate, requireAdmin, asyncHandler((req: AuthRequest, res) => deletePaymentLink(req, res)));
router.post('/:id/cancel', strictLimiter, authenticate, requireAdmin, asyncHandler((req: AuthRequest, res) => cancelPaymentLink(req, res)));

router.post(
  '/:id/send',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('send_payment_link'),
  validate(sendPaymentLinkSchema),
  asyncHandler((req: AuthRequest, res) => sendPaymentLink(req, res))
);

router.post(
  '/:id/mark-paid',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('mark_payment_received'),
  validate(markPaymentReceivedSchema),
  asyncHandler((req: AuthRequest, res) => markPaymentReceivedManually(req, res))
);

router.post(
  '/:paymentLinkId/activate',
  strictLimiter,
  authenticate,
  requireStaffOrAdmin,
  requirePermission('enroll_student'),
  validate(activatePackageSchema),
  asyncHandler((req: AuthRequest, res) => activatePackage(req, res))
);

export default router;
