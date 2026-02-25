import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../services/adminAuth.service';

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined =
    req.cookies?.admin_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : undefined);

  if (!token) {
    res.status(401).json({ error: 'Token administrateur manquant' });
    return;
  }

  const payload = verifyAdminToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Token administrateur invalide ou expiré' });
    return;
  }

  req.admin = payload;
  next();
}
