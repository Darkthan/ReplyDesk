import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const authSchema = z.object({
  email: z.string().email('Email invalide'),
  imapPassword: z.string().min(1, 'Mot de passe requis'),
  server_id: z.string().uuid().optional(),
});

router.post('/login', validate(authSchema), asyncHandler(AuthController.login));
router.post('/register', validate(authSchema), asyncHandler(AuthController.register));
router.post('/logout', asyncHandler(AuthController.logout));
router.get('/me', authMiddleware, asyncHandler(AuthController.me));

export default router;
