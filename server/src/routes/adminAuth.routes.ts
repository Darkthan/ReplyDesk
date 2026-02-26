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

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Ancien mot de passe requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères'),
});

router.post('/login', validate(adminLoginSchema), asyncHandler(AdminAuthController.login));
router.post('/logout', asyncHandler(AdminAuthController.logout));
router.get('/me', adminAuthMiddleware, asyncHandler(AdminAuthController.me));
router.post('/change-password', adminAuthMiddleware, validate(changePasswordSchema), asyncHandler(AdminAuthController.changePassword));

export default router;
