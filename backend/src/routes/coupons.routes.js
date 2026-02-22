import { Router } from 'express';
import { validateCoupon, createCoupon, listCoupons } from '../controllers/coupons.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/validate', validateCoupon);
router.get('/', listCoupons);
router.post('/', authMiddleware, createCoupon);

export default router;
