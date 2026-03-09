import { SecuritySettingsModel } from '../models/securitySettings.model';
import { IpRuleModel } from '../models/ipRule.model';
import { ConnectionLogModel } from '../models/connectionLog.model';

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

interface Settings {
  maxAttempts: number;
  windowMs: number;
  cachedAt: number;
}

const SETTINGS_TTL = 60_000; // 1 minute

let settingsCache: Settings | null = null;
const attempts = new Map<string, AttemptRecord>();

async function getSettings(): Promise<Settings> {
  if (settingsCache && Date.now() - settingsCache.cachedAt < SETTINGS_TTL) {
    return settingsCache;
  }
  const all = await SecuritySettingsModel.getAll();
  settingsCache = {
    maxAttempts: parseInt(all['max_attempts'] ?? '5', 10),
    windowMs: parseInt(all['lockout_duration_ms'] ?? '900000', 10),
    cachedAt: Date.now(),
  };
  return settingsCache;
}

export function invalidateSettingsCache(): void {
  settingsCache = null;
}

export interface LockedAccount {
  key: string;
  type: 'user' | 'admin';
  identifier: string;
  lockedUntil: number;
  remainingMs: number;
}

export function getLockedAccounts(): LockedAccount[] {
  const now = Date.now();
  const result: LockedAccount[] = [];
  for (const [key, rec] of attempts.entries()) {
    if (rec.lockedUntil && now < rec.lockedUntil) {
      const [type, ...rest] = key.split(':');
      result.push({
        key,
        type: type as 'user' | 'admin',
        identifier: rest.join(':'),
        lockedUntil: rec.lockedUntil,
        remainingMs: rec.lockedUntil - now,
      });
    }
  }
  return result;
}

export function unlockAccount(key: string): boolean {
  if (!attempts.has(key)) return false;
  attempts.delete(key);
  return true;
}

export function unlockAll(): void {
  attempts.clear();
}

function normalizeIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  // Normaliser ::ffff:x.x.x.x (IPv4 mappé IPv6)
  return ip.replace(/^::ffff:/, '');
}

export async function checkAccess(
  key: string,
  rawIp: string | undefined
): Promise<{ allowed: boolean; reason?: string }> {
  const ip = normalizeIp(rawIp);

  // Vérifier les règles IP
  try {
    const rule = await IpRuleModel.findByIp(ip);
    if (rule?.type === 'blacklist') {
      return { allowed: false, reason: 'IP bloquée par l\'administrateur' };
    }
    // Whitelisted : bypass total du compteur de tentatives
    if (rule?.type === 'whitelist') {
      return { allowed: true };
    }
  } catch {
    // Si la DB n'est pas encore prête, on laisse passer
  }

  // Vérifier le verrou de compte
  const rec = attempts.get(key) ?? { count: 0, lockedUntil: null };
  const { windowMs } = await getSettings();

  if (rec.lockedUntil) {
    if (Date.now() < rec.lockedUntil) {
      const minutes = Math.ceil((rec.lockedUntil - Date.now()) / 60_000);
      return { allowed: false, reason: `Compte verrouillé, réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}` };
    }
    // Fenêtre expirée : remettre à zéro
    attempts.set(key, { count: 0, lockedUntil: null });
  }

  return { allowed: true };
}

export async function recordFailure(
  key: string,
  rawIp: string | undefined,
  loginType: 'user' | 'admin',
  identifier: string,
  reason: string
): Promise<{ locked: boolean; remaining: number }> {
  const ip = normalizeIp(rawIp);
  const { maxAttempts, windowMs } = await getSettings();

  // Vérifier si l'IP est en whitelist (pas de comptage)
  try {
    const rule = await IpRuleModel.findByIp(ip);
    if (rule?.type === 'whitelist') {
      await ConnectionLogModel.create({ identifier, ip, login_type: loginType, success: false, failure_reason: reason });
      return { locked: false, remaining: maxAttempts };
    }
  } catch { /* DB pas prête */ }

  let rec = attempts.get(key) ?? { count: 0, lockedUntil: null };

  // Reset si la fenêtre est expirée
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    rec = { count: 0, lockedUntil: null };
  }

  rec.count += 1;

  if (rec.count >= maxAttempts) {
    rec.lockedUntil = Date.now() + windowMs;
    attempts.set(key, rec);
    try {
      await ConnectionLogModel.create({ identifier, ip, login_type: loginType, success: false, failure_reason: `${reason} — compte verrouillé` });
    } catch { /* ignorer */ }
    return { locked: true, remaining: 0 };
  }

  attempts.set(key, rec);
  try {
    await ConnectionLogModel.create({ identifier, ip, login_type: loginType, success: false, failure_reason: reason });
  } catch { /* ignorer */ }
  return { locked: false, remaining: maxAttempts - rec.count };
}

export async function recordSuccess(
  key: string,
  rawIp: string | undefined,
  loginType: 'user' | 'admin',
  identifier: string
): Promise<void> {
  attempts.delete(key);
  try {
    await ConnectionLogModel.create({ identifier, ip: normalizeIp(rawIp), login_type: loginType, success: true });
  } catch { /* ignorer */ }
}
