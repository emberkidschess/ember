import { Router } from 'express';
import { streamChat } from '../controllers/chatController';
import { chatLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', chatLimiter, streamChat);

export default router;
