import { Router } from 'express';
import { z } from 'zod';
import { ClosuresController } from '../controllers/closures.controller';
import { authMiddleware } from '../middleware/auth';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';

const createClosureSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  start_date: z.string().datetime({ message: 'Date de début invalide' }),
  end_date: z.string().datetime({ message: 'Date de fin invalide' }),
  default_subject: z.string().min(1, 'Sujet par défaut requis'),
  default_message: z.string().min(1, 'Message par défaut requis'),
  reason: z.string().optional(),
});

const updateClosureSchema = createClosureSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// Routes utilisateur (auth IMAP)
export const closuresPublicRouter = Router();
closuresPublicRouter.get('/', authMiddleware, asyncHandler(ClosuresController.list));
closuresPublicRouter.get('/mine', authMiddleware, asyncHandler(ClosuresController.listMine));
closuresPublicRouter.post('/mine', authMiddleware, validate(createClosureSchema), asyncHandler(ClosuresController.createMine));
closuresPublicRouter.put('/mine/:id', authMiddleware, validate(updateClosureSchema), asyncHandler(ClosuresController.updateMine));
closuresPublicRouter.delete('/mine/:id', authMiddleware, asyncHandler(ClosuresController.deleteMine));

// Admin CRUD
export const closuresAdminRouter = Router();
closuresAdminRouter.use(adminAuthMiddleware);
closuresAdminRouter.get('/', asyncHandler(ClosuresController.list));
closuresAdminRouter.post('/', validate(createClosureSchema), asyncHandler(ClosuresController.create));
closuresAdminRouter.put('/:id', validate(updateClosureSchema), asyncHandler(ClosuresController.update));
closuresAdminRouter.delete('/:id', asyncHandler(ClosuresController.delete));
