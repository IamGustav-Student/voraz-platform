import { Router } from 'express';
import { getInfluencers, getVideos } from '../controllers/community.controller.js';

const router = Router();

router.get('/influencers', getInfluencers);
router.get('/videos', getVideos);

export default router;