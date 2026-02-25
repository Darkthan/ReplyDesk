import { Request, Response } from 'express';
import { SubscriptionModel } from '../models/subscription.model';

export const SubscriptionsController = {
  async list(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const subscriptions = await SubscriptionModel.findByUser(req.user.userId);
    res.json(subscriptions);
  },

  async create(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    try {
      const subscription = await SubscriptionModel.create({
        user_id: req.user.userId,
        ...req.body,
      });
      res.status(201).json(subscription);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('unique_user_closure')) {
        res.status(409).json({ error: 'Souscription déjà existante pour cette période' });
        return;
      }
      throw err;
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const existing = await SubscriptionModel.findById(req.params.id);
    if (!existing || existing.user_id !== req.user.userId) {
      res.status(404).json({ error: 'Souscription non trouvée' });
      return;
    }

    const subscription = await SubscriptionModel.update(req.params.id, req.body);
    res.json(subscription);
  },

  async delete(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const existing = await SubscriptionModel.findById(req.params.id);
    if (!existing || existing.user_id !== req.user.userId) {
      res.status(404).json({ error: 'Souscription non trouvée' });
      return;
    }

    await SubscriptionModel.delete(req.params.id);
    res.status(204).send();
  },
};
