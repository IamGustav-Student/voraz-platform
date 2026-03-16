import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateCoupon, createCoupon, listCoupons } from '../controllers/coupons.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

const couponLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 5, // 5 intentos cada 10 minutos
    message: { status: 'error', message: 'Demasiados intentos de validación. Intentá más tarde.' }
});

router.post('/validate', couponLimiter, validateCoupon);
router.get('/', listCoupons);
router.post('/', authMiddleware, createCoupon);

export default router;
