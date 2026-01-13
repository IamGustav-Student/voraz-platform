import { Router } from 'express';
import { getMenu } from '../controllers/products.controller.js';

const router = Router();

// GET /api/products
router.get('/', getMenu);

export default router;