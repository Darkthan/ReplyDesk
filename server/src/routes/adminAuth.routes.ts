import { Router } from 'express';
import { z } from 'zod';
import { AdminAuthController } from '../controllers/adminAuth.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const adminLoginSchema = z.object({
  username: z.string().min(1, 'Nom d\'utilisateur requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

router.post('/login', validate(adminLoginSchema), asyncHandler(AdminAuthController.login));
router.post('/logout', asyncHandler(AdminAuthController.logout));
router.get('/me', adminAuthMiddleware, asyncHandler(AdminAuthController.me));

export default router;
