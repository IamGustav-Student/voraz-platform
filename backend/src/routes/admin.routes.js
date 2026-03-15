import { Router } from 'express';
import { adminMiddleware } from '../middleware/auth.middleware.js';
import { requireCustomBranding } from '../middleware/tenant.middleware.js';
import {
  getDashboardStats,
  getAdminProducts, createProduct, updateProduct, deleteProduct,
  getCategories, createCategory, updateCategory, deleteCategory,
  getAdminStores, createStore, updateStore, deleteStore,
  getLoyaltyConfig, updateLoyaltyConfig,
  createVideo, deleteVideo,
  createNews, updateNews, deleteNews,
  uploadImage,
  getAdminOrders, updateOrderStatus,
  getMercadopagoConfig, saveMercadopagoConfig,
  getBranding, updateBranding,
  getQRConfig,
} from '../controllers/admin.controller.js';
import { getStoreId } from '../utils/tenant.js';
import { getSubscriptionStatus, createUpgradeCheckout } from '../controllers/subscriptions.controller.js';

const router = Router();
router.use(adminMiddleware);

router.get('/stats', getDashboardStats);

router.get('/products', getAdminProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/stores', getAdminStores);
router.post('/stores', createStore);
router.put('/stores/:id', updateStore);
router.delete('/stores/:id', deleteStore);

router.get('/loyalty', getLoyaltyConfig);
router.patch('/loyalty', updateLoyaltyConfig);

router.post('/videos', createVideo);
router.delete('/videos/:id', deleteVideo);

router.post('/news', createNews);
router.put('/news/:id', updateNews);
router.delete('/news/:id', deleteNews);

router.post('/upload', uploadImage);

router.get('/orders', getAdminOrders);
router.patch('/orders/:id/status', updateOrderStatus);

router.get('/mercadopago', getMercadopagoConfig);
router.post('/mercadopago', saveMercadopagoConfig);

// Branding — lectura libre para admin, escritura requiere custom_branding_enabled=true
router.get('/branding', getBranding);
router.patch('/branding', requireCustomBranding, updateBranding);

// QR Menu
router.get('/qr-config', getQRConfig);

// Suscripción
router.get('/subscription', async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    req.params.store_id = storeId; 
    return getSubscriptionStatus(req, res);
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});
router.post('/subscription/upgrade', createUpgradeCheckout);

export default router;
