import { Router } from 'express';
import { adminLogin, adminRefreshToken, adminLogout, adminForgotPassword, adminResetPassword } from '../controllers/adminAuthController';
import { authLimiter } from '../middleware/rateLimiter';
import { validate, forgotPasswordSchema, loginSchema, resetPasswordSchema } from '../utils/validation';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), adminLogin);
router.post('/refresh', authLimiter, adminRefreshToken);
router.post('/logout', adminLogout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), adminForgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), adminResetPassword);
router.get('/session', authenticate, requireAdmin, (req: AuthRequest, res) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
