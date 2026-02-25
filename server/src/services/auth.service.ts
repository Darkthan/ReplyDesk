import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';
import { UserModel } from '../models/user.model';
import { ServerModel } from '../models/server.model';
import { validateImapCredentials } from './imap.service';
import { encrypt } from './encryption.service';
import { extractDomain } from '../utils/domainMatcher';

export type AuthError = { code: 'server_not_found' | 'unreachable' | 'auth_failed' | 'unknown'; message: string };

export async function authenticateAndGetToken(
  email: string,
  imapPassword: string,
  serverId?: string,
): Promise<{ token: string; user: { id: string; email: string; role: string } } | { error: AuthError }> {
  // Trouver le serveur : par ID (sélection explicite) ou par domaine de l'email
  let server = null;

  if (serverId) {
    server = await ServerModel.findById(serverId);
  } else {
    const domain = extractDomain(email);
    server = await ServerModel.findByDomain(domain);
  }

  if (!server) {
    return { error: { code: 'server_not_found', message: 'Aucun serveur mail configuré pour ce domaine' } };
  }

  // Valider les identifiants IMAP avec le serveur configuré
  const result = await validateImapCredentials({
    host: server.imap_host,
    port: server.imap_port,
    secure: server.imap_secure,
    auth: { user: email, pass: imapPassword },
  });

  if (!result.ok) {
    return { error: { code: result.reason, message: result.message } };
  }

  let user = await UserModel.findByEmail(email);

  // Chiffrer le mot de passe IMAP
  const { enc, iv, tag } = encrypt(imapPassword);

  if (user) {
    // Utilisateur existant: mettre à jour le mot de passe
    await UserModel.updatePassword(user.id, enc, iv, tag);
    user = await UserModel.findByEmail(email);
  } else {
    // Nouvel utilisateur: créer le compte
    user = await UserModel.create({
      email: email.toLowerCase(),
      role: 'user', // Tous les utilisateurs IMAP sont 'user', pas 'admin'
      imap_password_enc: enc,
      imap_password_iv: iv,
      imap_password_tag: tag,
      mail_server_id: server.id,
    });
  }

  if (!user) return { error: { code: 'unknown' as const, message: 'Erreur lors de la création du compte' } };

  // Générer le token JWT
  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}
