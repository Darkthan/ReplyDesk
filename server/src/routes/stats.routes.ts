import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/replies-per-day', asyncHandler(StatsController.getRepliesPerDay));
router.get('/replies-per-hour', asyncHandler(StatsController.getRepliesPerHour));
router.get('/top-users', asyncHandler(StatsController.getTopUsers));
router.get('/users', asyncHandler(StatsController.getUsers));

export default router;
