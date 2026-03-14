import { Router } from 'express';
import {
  createSubscriptionCheckout,
  createPublicCheckout,
  createTrialTenant,
  handleSubscriptionWebhook,
  getSubscriptionStatus,
  activateSandboxStore,
  getPublicPlans,
} from '../controllers/subscriptions.controller.js';
import { superadminMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// ── Públicos (sin auth) ───────────────────────────────────────────────────────
router.post('/webhook', handleSubscriptionWebhook);
router.post('/trial', createTrialTenant);                         // 7 días gratis
router.post('/checkout-public', createPublicCheckout);            // desde la landing
router.post('/activate-sandbox', activateSandboxStore);           // activación manual sandbox
router.get('/plans', getPublicPlans);                             // planes dinámicos para la landing

// ── Protegidos (superadmin) ───────────────────────────────────────────────────
router.post('/checkout', superadminMiddleware, createSubscriptionCheckout);
router.get('/status/:store_id', getSubscriptionStatus);           // polling post-pago (público — solo devuelve status)

export default router;
