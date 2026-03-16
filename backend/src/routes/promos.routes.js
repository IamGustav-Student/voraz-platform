import { Router } from 'express';
import { getPromos } from '../controllers/promos.controller.js';

const router = Router();

// Ruta pública para ver promos de un tenant
router.get('/', getPromos);

export default router;
