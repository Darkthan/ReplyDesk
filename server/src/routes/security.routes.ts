import { Router } from 'express';
import { SecurityController } from '../controllers/security.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Toutes les routes sécurité sont réservées aux admins
router.use(adminAuthMiddleware);

router.get('/settings', asyncHandler(SecurityController.getSettings));
router.put('/settings', asyncHandler(SecurityController.updateSettings));

router.get('/ip-rules', asyncHandler(SecurityController.getIpRules));
router.post('/ip-rules', asyncHandler(SecurityController.createIpRule));
router.delete('/ip-rules/:id', asyncHandler(SecurityController.deleteIpRule));

router.get('/logs', asyncHandler(SecurityController.getLogs));
router.delete('/logs', asyncHandler(SecurityController.clearLogs));

export default router;
