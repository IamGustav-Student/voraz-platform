import { Router } from 'express';
import {
  createSubscriptionCheckout,
  handleSubscriptionWebhook,
  getSubscriptionStatus,
} from '../controllers/subscriptions.controller.js';
import { superadminMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/webhook', handleSubscriptionWebhook);
router.post('/checkout', superadminMiddleware, createSubscriptionCheckout);
router.get('/status/:store_id', superadminMiddleware, getSubscriptionStatus);

export default router;
