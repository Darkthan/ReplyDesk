import { Router } from 'express';
import { z } from 'zod';
import { ServersController } from '../controllers/servers.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const createServerSchema = z.object({
  domain: z.string().min(1, 'Domaine requis'),
  display_name: z.string().min(1, 'Nom d\'affichage requis'),
  imap_host: z.string().min(1, 'Hôte IMAP requis'),
  imap_port: z.number().int().positive().default(993),
  imap_secure: z.enum(['ssl', 'starttls', 'none']).default('ssl'),
  imap_login_format: z.enum(['full', 'local']).default('full'),
  smtp_host: z.string().min(1, 'Hôte SMTP requis'),
  smtp_port: z.number().int().positive().default(587),
  smtp_secure: z.enum(['ssl', 'starttls', 'none']).default('none'),
  smtp_user: z.string().min(1, 'Compte SMTP requis'),
  smtp_password: z.string().min(1, 'Mot de passe SMTP requis'),
});

const updateServerSchema = createServerSchema.partial();

router.use(adminAuthMiddleware);

router.get('/', asyncHandler(ServersController.list));
router.post('/', validate(createServerSchema), asyncHandler(ServersController.create));
router.get('/:id/test', asyncHandler(ServersController.testConnection));
router.get('/:id', asyncHandler(ServersController.getById));
router.put('/:id', validate(updateServerSchema), asyncHandler(ServersController.update));
router.delete('/:id', asyncHandler(ServersController.delete));

export default router;
