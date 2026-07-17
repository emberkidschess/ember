import { Router } from 'express';
import {
  getNotifications,
  getNotificationById,
  createNotification,
  getNotificationStats,
  retryNotification,
  retryAllFailed,
  getDeliveryLogs,
  getStudentNotifications,
} from '../controllers/notificationController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { authenticateClient, ClientAuthRequest } from '../middleware/clientAuth';

const router = Router();

router.get('/', authenticate, requireAdmin, (req: AuthRequest, res) => getNotifications(req, res));
router.get('/stats', authenticate, requireAdmin, (req: AuthRequest, res) => getNotificationStats(req, res));
router.get('/delivery-logs', authenticate, requireAdmin, (req: AuthRequest, res) => getDeliveryLogs(req, res));
router.get('/my', authenticateClient, (req: ClientAuthRequest, res) => getStudentNotifications(req, res));
router.get('/:id', authenticate, requireAdmin, (req: AuthRequest, res) => getNotificationById(req, res));

router.post('/', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => createNotification(req, res));

router.post('/:id/retry', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => retryNotification(req, res));
router.post('/retry-all', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => retryAllFailed(req, res));

export default router;
