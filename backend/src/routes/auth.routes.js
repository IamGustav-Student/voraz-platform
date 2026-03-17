import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Limitar intentos de login y registro
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, // 10 intentos por 15 minutos
    message: { status: 'error', message: 'Demasiados intentos. Por favor esperá 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS', // ignorar preflight CORS
});

// Rate limit específico para forgot password — más permisivo que login
const forgotLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hora
    max: 5,                      // 5 solicitudes por hora por IP
    message: { status: 'error', message: 'Demasiadas solicitudes. Esperá 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS', // ignorar preflight CORS
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, me);
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/reset-password', forgotLimiter, resetPassword);

export default router;
