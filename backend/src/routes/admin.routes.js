import { Router } from 'express';
import { adminMiddleware } from '../middleware/auth.middleware.js';
import { requireCustomBranding } from '../middleware/tenant.middleware.js';
import {
  getDashboardStats,
  getAdminProducts, createProduct, updateProduct, deleteProduct,
  getCategories, createCategory, updateCategory, deleteCategory,
  getAdminStores, createStore, updateStore, deleteStore,
  getAdminCoupons, createCoupon, updateCoupon, deleteCoupon,
  createVideo, deleteVideo,
  createNews, updateNews, deleteNews,
  uploadImage,
  getAdminOrders, updateOrderStatus,
  getMercadopagoConfig, saveMercadopagoConfig,
  getBranding, updateBranding,
  getQRConfig,
} from '../controllers/admin.controller.js';
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

router.get('/coupons', getAdminCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

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
router.get('/subscription', (req, res) => {
  req.params.store_id = req.tenant.id; // Hack para reutilizar getSubscriptionStatus que espera store_id
  return getSubscriptionStatus(req, res);
});
router.post('/subscription/upgrade', createUpgradeCheckout);

export default router;
