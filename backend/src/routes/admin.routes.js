import { Router } from 'express';
import { adminMiddleware } from '../middleware/auth.middleware.js';
import {
  getDashboardStats,
  getAdminProducts, createProduct, updateProduct, deleteProduct, getCategories,
  getAdminCoupons, createCoupon, updateCoupon, deleteCoupon,
  createVideo, deleteVideo,
  createNews, updateNews, deleteNews,
  uploadImage,
  getAdminOrders,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(adminMiddleware);

router.get('/stats', getDashboardStats);

router.get('/products', getAdminProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/categories', getCategories);

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

export default router;
