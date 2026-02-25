import { Request, Response } from 'express';
import { authenticateAdmin } from '../services/adminAuth.service';
import { AdminModel } from '../models/admin.model';
import { checkAccess, recordFailure, recordSuccess } from '../services/loginAttempts.service';

const ADMIN_COOKIE_NAME = 'admin_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

export const AdminAuthController = {
  async login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;
    const key = `admin:${username.toLowerCase()}`;
    const ip = req.ip;

    const access = await checkAccess(key, ip);
    if (!access.allowed) {
      res.status(429).json({ error: access.reason ?? 'Accès refusé' });
      return;
    }

    const result = await authenticateAdmin(username, password);

    if (!result) {
      const { remaining, locked } = await recordFailure(key, ip, 'admin', username, 'Identifiants invalides');
      const hint = locked
        ? ' — compte verrouillé'
        : remaining > 0
        ? ` (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`
        : '';
      res.status(401).json({ error: 'Identifiants administrateur invalides' + hint });
      return;
    }

    await recordSuccess(key, ip, 'admin', username);
    res.cookie(ADMIN_COOKIE_NAME, result.token, COOKIE_OPTIONS);
    res.json({ admin: result.admin });
  },

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.admin) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const admin = await AdminModel.findById(req.admin.adminId);

    if (!admin) {
      res.status(404).json({ error: 'Administrateur non trouvé' });
      return;
    }

    res.json(admin);
  },
};
