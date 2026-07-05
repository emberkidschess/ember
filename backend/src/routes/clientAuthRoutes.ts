import { Router } from 'express';
import { clientLogin, clientRefreshToken, clientLogout, clientForgotPassword, clientResetPassword } from '../controllers/clientAuthController';
import { authLimiter } from '../middleware/rateLimiter';
import { validate, forgotPasswordSchema, loginSchema, resetPasswordSchema } from '../utils/validation';
import { authenticateClient, ClientAuthRequest } from '../middleware/clientAuth';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), clientLogin);
router.post('/refresh', authLimiter, clientRefreshToken);
router.post('/logout', clientLogout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), clientForgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), clientResetPassword);
router.get('/session', authenticateClient, (req: ClientAuthRequest, res) => {
  res.json({ success: true, data: { client: req.client } });
});

export default router;
