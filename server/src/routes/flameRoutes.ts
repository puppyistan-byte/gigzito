import { Router } from 'express';
import { sendInquiry } from '../controllers/geezeeLogic';

const router = Router();

// Endpoint for ❤️ 👀 💰 🪭
router.post('/inquiry', sendInquiry);

export default router;
