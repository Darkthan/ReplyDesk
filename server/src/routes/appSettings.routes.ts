import { Router } from 'express';
import { AppSettingsController } from '../controllers/appSettings.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.get('/admin/app-settings', adminAuthMiddleware, asyncHandler(AppSettingsController.get));
router.put('/admin/app-settings', adminAuthMiddleware, asyncHandler(AppSettingsController.update));
router.get('/app-settings', asyncHandler(AppSettingsController.getPublic));

export default router;
