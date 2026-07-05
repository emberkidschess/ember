import { Router } from 'express';
import emailService from '../services/emailService';
import { strictLimiter } from '../middleware/rateLimiter';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/email', strictLimiter, authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required',
      });
    }

    const result = await emailService.sendTestEmail(to);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
    });
  }
});

export default router;
