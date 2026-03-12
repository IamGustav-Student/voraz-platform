import { Router } from 'express';
import { superadminMiddleware } from '../middleware/auth.middleware.js';
import {
  superadminLogin,
  superadminSetup,
  getGlobalStats,
  listAllStores,
  createTenant,
  updateStoreStatus,
  updateStorePlan,
  getPlanPrices,
  getGastroRedConfig,
  updateGastroRedConfig,
  toggleCustomBranding,
} from '../controllers/superadmin.controller.js';

const router = Router();

router.post('/login', superadminLogin);
router.post('/setup', superadminSetup);

router.use(superadminMiddleware);

router.get('/stats', getGlobalStats);
router.get('/stores', listAllStores);
router.post('/stores', createTenant);
router.patch('/stores/:id/status', updateStoreStatus);
router.patch('/stores/:id/plan', updateStorePlan);
router.patch('/tenants/:id/branding-toggle', toggleCustomBranding);
router.get('/plans', getPlanPrices);

// Configuración de la plataforma
router.get('/config', getGastroRedConfig);
router.put('/config', updateGastroRedConfig);

export default router;
