import { Router } from 'express';
import { createPreference, webhook, getPublicKey } from '../controllers/payments.controller.js';

const router = Router();

router.get('/public-key', getPublicKey);
router.post('/preference', createPreference);
router.post('/webhook', webhook);

export default router;
