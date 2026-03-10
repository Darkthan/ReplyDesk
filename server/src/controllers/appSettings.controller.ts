import { Request, Response } from 'express';
import { SecuritySettingsModel } from '../models/securitySettings.model';

async function getCurrent() {
  const all = await SecuritySettingsModel.getAll();
  return {
    app_name: all['app_name'] ?? 'EmailAuto',
    app_logo: all['app_logo'] || null,
  };
}

export const AppSettingsController = {
  async getPublic(_req: Request, res: Response): Promise<void> {
    res.json(await getCurrent());
  },

  async get(_req: Request, res: Response): Promise<void> {
    res.json(await getCurrent());
  },

  async update(req: Request, res: Response): Promise<void> {
    const { app_name, app_logo } = req.body;

    if (app_name !== undefined) {
      if (typeof app_name !== 'string' || app_name.trim().length === 0 || app_name.length > 100) {
        res.status(400).json({ error: 'Nom invalide (1–100 caractères)' });
        return;
      }
      await SecuritySettingsModel.set('app_name', app_name.trim());
    }

    if (app_logo !== undefined) {
      if (app_logo === null || app_logo === '') {
        await SecuritySettingsModel.set('app_logo', '');
      } else {
        if (typeof app_logo !== 'string') {
          res.status(400).json({ error: 'Format de logo invalide' });
          return;
        }
        if (!app_logo.startsWith('data:image/') && !/^https?:\/\//.test(app_logo)) {
          res.status(400).json({ error: 'Le logo doit être une URL ou une image encodée' });
          return;
        }
        if (app_logo.length > 600_000) {
          res.status(400).json({ error: 'Logo trop volumineux (max ~450 Ko)' });
          return;
        }
        await SecuritySettingsModel.set('app_logo', app_logo);
      }
    }

    res.json(await getCurrent());
  },
};
