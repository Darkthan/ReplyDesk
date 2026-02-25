import { Router } from 'express';
import authRoutes from './auth.routes';
import adminAuthRoutes from './adminAuth.routes';
import serversRoutes from './servers.routes';
import { closuresPublicRouter, closuresAdminRouter } from './closures.routes';
import usersRoutes from './users.routes';
import subscriptionsRoutes from './subscriptions.routes';
import securityRoutes from './security.routes';
import { ServerModel } from '../models/server.model';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Authentification
router.use('/auth', authRoutes);           // Pour les utilisateurs (IMAP)
router.use('/admin/auth', adminAuthRoutes); // Pour les admins (username/password)

// Routes admin (protégées)
router.use('/admin/servers', serversRoutes);
router.use('/admin/closures', closuresAdminRouter);
router.use('/admin/users', usersRoutes);
router.use('/admin/security', securityRoutes);

// Routes publiques/utilisateurs
router.use('/closures', closuresPublicRouter);
router.use('/subscriptions', subscriptionsRoutes);

// Liste publique des serveurs (pour le formulaire de connexion)
router.get('/servers', asyncHandler(async (_req, res) => {
  const servers = await ServerModel.findAll();
  res.json(servers.map(s => ({ id: s.id, display_name: s.display_name, domain: s.domain })));
}));

export default router;
