import { Router } from 'express';
import { getPointsHistory, updateProfile, getUserOrders } from '../controllers/users.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:id/points', authMiddleware, getPointsHistory);
router.get('/:id/orders', authMiddleware, getUserOrders);
router.patch('/me', authMiddleware, updateProfile);

export default router;
