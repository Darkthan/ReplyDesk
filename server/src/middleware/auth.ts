import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Lire depuis le cookie HttpOnly en priorité, fallback sur Bearer header
  const token: string | undefined =
    req.cookies?.auth_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : undefined);

  if (!token) {
    res.status(401).json({ error: 'Token manquant' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Token invalide ou expiré' });
    return;
  }

  if (!payload.userId) {
    res.status(401).json({ error: 'Session invalide, veuillez vous reconnecter' });
    return;
  }

  req.user = payload;
  next();
}
