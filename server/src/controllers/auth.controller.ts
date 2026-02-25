import { Request, Response } from 'express';
import { authenticateAndGetToken } from '../services/auth.service';
import { UserModel } from '../models/user.model';
import { checkAccess, recordFailure, recordSuccess } from '../services/loginAttempts.service';

const COOKIE_NAME = 'auth_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

async function handleLogin(req: Request, res: Response, statusOnSuccess: number): Promise<void> {
  const { email, imapPassword, server_id } = req.body;
  const key = email.toLowerCase();
  const ip = req.ip;

  const access = await checkAccess(key, ip);
  if (!access.allowed) {
    res.status(429).json({ error: access.reason ?? 'Accès refusé' });
    return;
  }

  const result = await authenticateAndGetToken(email, imapPassword, server_id);
  if ('error' in result) {
    const { remaining, locked } = await recordFailure(key, ip, 'user', key, result.error.message);
    const hint = locked
      ? ' — compte verrouillé'
      : remaining > 0
      ? ` (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`
      : '';
    res.status(401).json({ error: result.error.message + hint });
    return;
  }

  await recordSuccess(key, ip, 'user', key);
  res.cookie(COOKIE_NAME, result.token, COOKIE_OPTIONS);
  res.status(statusOnSuccess).json({ user: result.user });
}

export const AuthController = {
  async login(req: Request, res: Response): Promise<void> {
    return handleLogin(req, res, 200);
  },

  async register(req: Request, res: Response): Promise<void> {
    return handleLogin(req, res, 201);
  },

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const user = await UserModel.findByEmail(req.user.email);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      mail_server_id: user.mail_server_id,
      is_active: user.is_active,
      created_at: user.created_at,
    });
  },
};
