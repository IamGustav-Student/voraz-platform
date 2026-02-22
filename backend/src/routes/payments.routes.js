import { Router } from 'express';
import { createPreference, webhook } from '../controllers/payments.controller.js';

const router = Router();

router.post('/preference', createPreference);
router.post('/webhook', webhook);

export default router;
