import { Request, Response } from 'express';
import { SecuritySettingsModel } from '../models/securitySettings.model';
import { IpRuleModel } from '../models/ipRule.model';
import { ConnectionLogModel } from '../models/connectionLog.model';
import { invalidateSettingsCache } from '../services/loginAttempts.service';

export const SecurityController = {
  // ── Paramètres ──────────────────────────────────────────────────────────────

  async getSettings(_req: Request, res: Response): Promise<void> {
    const all = await SecuritySettingsModel.getAll();
    res.json({
      max_attempts: parseInt(all['max_attempts'] ?? '5', 10),
      lockout_duration_minutes: Math.round(parseInt(all['lockout_duration_ms'] ?? '900000', 10) / 60_000),
    });
  },

  async updateSettings(req: Request, res: Response): Promise<void> {
    const { max_attempts, lockout_duration_minutes } = req.body;

    if (max_attempts !== undefined) {
      const val = parseInt(max_attempts, 10);
      if (isNaN(val) || val < 1 || val > 100) {
        res.status(400).json({ error: 'max_attempts doit être entre 1 et 100' });
        return;
      }
      await SecuritySettingsModel.set('max_attempts', String(val));
    }

    if (lockout_duration_minutes !== undefined) {
      const val = parseInt(lockout_duration_minutes, 10);
      if (isNaN(val) || val < 1 || val > 1440) {
        res.status(400).json({ error: 'lockout_duration_minutes doit être entre 1 et 1440' });
        return;
      }
      await SecuritySettingsModel.set('lockout_duration_ms', String(val * 60_000));
    }

    invalidateSettingsCache();

    const all = await SecuritySettingsModel.getAll();
    res.json({
      max_attempts: parseInt(all['max_attempts'] ?? '5', 10),
      lockout_duration_minutes: Math.round(parseInt(all['lockout_duration_ms'] ?? '900000', 10) / 60_000),
    });
  },

  // ── Règles IP ────────────────────────────────────────────────────────────────

  async getIpRules(_req: Request, res: Response): Promise<void> {
    const rules = await IpRuleModel.findAll();
    res.json(rules);
  },

  async createIpRule(req: Request, res: Response): Promise<void> {
    const { ip, type, note } = req.body;

    if (!ip || typeof ip !== 'string') {
      res.status(400).json({ error: 'IP requise' });
      return;
    }
    if (type !== 'whitelist' && type !== 'blacklist') {
      res.status(400).json({ error: 'type doit être "whitelist" ou "blacklist"' });
      return;
    }

    // Validation IP simple (v4 et v6)
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6 = /^[0-9a-fA-F:]+$/;
    const cleaned = ip.trim().replace(/^::ffff:/, '');
    if (!ipv4.test(cleaned) && !ipv6.test(cleaned)) {
      res.status(400).json({ error: 'Adresse IP invalide' });
      return;
    }

    try {
      const rule = await IpRuleModel.create({ ip: cleaned, type, note });
      res.status(201).json(rule);
    } catch (err: any) {
      if (err.message?.includes('UNIQUE') || err.message?.includes('unique')) {
        res.status(409).json({ error: 'Cette IP possède déjà une règle' });
      } else {
        throw err;
      }
    }
  },

  async deleteIpRule(req: Request, res: Response): Promise<void> {
    const deleted = await IpRuleModel.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Règle introuvable' });
      return;
    }
    res.status(204).send();
  },

  // ── Journaux de connexion ────────────────────────────────────────────────────

  async getLogs(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const login_type = req.query.login_type as 'user' | 'admin' | undefined;
    const successParam = req.query.success;
    const success = successParam === 'true' ? true : successParam === 'false' ? false : undefined;

    const { logs, total } = await ConnectionLogModel.findAll({ limit, offset, login_type, success });
    res.json({ logs, total, pages: Math.ceil(total / limit) });
  },

  async clearLogs(_req: Request, res: Response): Promise<void> {
    await ConnectionLogModel.deleteAll();
    res.status(204).send();
  },
};
