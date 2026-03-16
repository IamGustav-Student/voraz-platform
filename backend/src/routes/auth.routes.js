import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Limitar intentos de login y registro
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, // 10 intentos por 15 minutos
    message: { status: 'error', message: 'Demasiados intentos. Por favor esperá 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, me);

export default router;
