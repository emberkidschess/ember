import { Router } from 'express';
import { getSiteConfig, updateSiteConfig } from '../controllers/siteController';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, requireStaffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/config', getSiteConfig);

router.put('/config', strictLimiter, authenticate, requireAdmin, (req: AuthRequest, res) => updateSiteConfig(req, res));

export default router;
