import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AdminModel } from '../models/admin.model';

interface AdminJwtPayload {
  adminId: string;
  username: string;
  type: 'admin';
}

export async function authenticateAdmin(
  username: string,
  password: string
): Promise<{ token: string; admin: { id: string; username: string; email: string | null } } | null> {
  // Récupérer l'admin par username
  const admin = await AdminModel.findByUsername(username);

  if (!admin || !admin.is_active) {
    return null;
  }

  // Vérifier le mot de passe
  const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

  if (!isPasswordValid) {
    return null;
  }

  // Générer le token JWT
  const payload: AdminJwtPayload = {
    adminId: admin.id,
    username: admin.username,
    type: 'admin',
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

  return {
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
    },
  };
}

export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AdminJwtPayload;

    // Vérifier que c'est bien un token admin
    if (payload.type !== 'admin') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function createAdmin(data: {
  username: string;
  password: string;
  email?: string;
}): Promise<{ id: string; username: string; email: string | null }> {
  const password_hash = await hashPassword(data.password);

  return AdminModel.create({
    username: data.username,
    password_hash,
    email: data.email,
  });
}

export async function changeAdminPassword(
  adminId: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  const admin = await AdminModel.findById(adminId);

  if (!admin) {
    return false;
  }

  // Récupérer l'admin avec le password_hash pour vérification
  const adminWithHash = await AdminModel.findByUsername(admin.username);

  if (!adminWithHash) {
    return false;
  }

  // Vérifier l'ancien mot de passe
  const isValid = await bcrypt.compare(oldPassword, adminWithHash.password_hash);

  if (!isValid) {
    return false;
  }

  // Hasher et mettre à jour le nouveau mot de passe
  const newPasswordHash = await hashPassword(newPassword);
  await AdminModel.updatePassword(adminId, newPasswordHash);

  return true;
}
