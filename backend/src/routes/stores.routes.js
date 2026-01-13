import { Router } from 'express';
import { getStores } from '../controllers/stores.controller.js';

const router = Router();

router.get('/', getStores);

export default router;