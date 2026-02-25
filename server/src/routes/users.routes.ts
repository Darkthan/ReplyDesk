import { Router } from 'express';
import { z } from 'zod';
import { UsersController } from '../controllers/users.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const updateUserSchema = z.object({
  role: z.enum(['user', 'admin']),
});

router.use(adminAuthMiddleware);

router.get('/', asyncHandler(UsersController.list));
router.put('/:id', validate(updateUserSchema), asyncHandler(UsersController.update));
router.delete('/:id', asyncHandler(UsersController.delete));

export default router;
