import { Router } from 'express';
import { staffLogin, staffRefreshToken, staffLogout, staffForgotPassword, staffResetPassword } from '../controllers/staffAuthController';
import { authLimiter } from '../middleware/rateLimiter';
import { validate, forgotPasswordSchema, loginSchema, resetPasswordSchema } from '../utils/validation';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), staffLogin);
router.post('/refresh', authLimiter, staffRefreshToken);
router.post('/logout', staffLogout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), staffForgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), staffResetPassword);
router.get('/session', authenticate, requireRole('coach', 'staff'), (req: AuthRequest, res) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
