import { Router } from 'express';
import {
  createSubscriptionCheckout,
  createPublicCheckout,
  createTrialTenant,
  handleSubscriptionWebhook,
  getSubscriptionStatus,
} from '../controllers/subscriptions.controller.js';
import { superadminMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// ── Públicos (sin auth) ───────────────────────────────────────────────────────
router.post('/webhook', handleSubscriptionWebhook);
router.post('/trial', createTrialTenant);       // 7 días gratis
router.post('/checkout-public', createPublicCheckout);    // desde la landing

// ── Protegidos (superadmin) ───────────────────────────────────────────────────
router.post('/checkout', superadminMiddleware, createSubscriptionCheckout);
router.get('/status/:store_id', superadminMiddleware, getSubscriptionStatus);

export default router;
