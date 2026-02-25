import { Request, Response } from 'express';
import { ClosureModel } from '../models/closure.model';
import { SubscriptionModel } from '../models/subscription.model';

export const ClosuresController = {
  // Liste des périodes admin (created_by IS NULL)
  async list(_req: Request, res: Response): Promise<void> {
    const closures = await ClosureModel.findAll();
    res.json(closures);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const closure = await ClosureModel.findById(req.params.id);
    if (!closure) {
      res.status(404).json({ error: 'Période non trouvée' });
      return;
    }
    res.json(closure);
  },

  // Création admin (created_by = null)
  async create(req: Request, res: Response): Promise<void> {
    const closure = await ClosureModel.create({
      ...req.body,
      created_by: null,
    });
    res.status(201).json(closure);
  },

  async update(req: Request, res: Response): Promise<void> {
    const closure = await ClosureModel.update(req.params.id, req.body);
    if (!closure) {
      res.status(404).json({ error: 'Période non trouvée' });
      return;
    }
    res.json(closure);
  },

  async delete(req: Request, res: Response): Promise<void> {
    const deleted = await ClosureModel.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Période non trouvée' });
      return;
    }
    res.status(204).send();
  },

  // ── Routes utilisateur ────────────────────────────────────────

  // Liste des périodes de l'utilisateur connecté
  async listMine(req: Request, res: Response): Promise<void> {
    const closures = await ClosureModel.findByUser(req.user!.userId);
    res.json(closures);
  },

  // Créer sa propre période + auto-souscription
  async createMine(req: Request, res: Response): Promise<void> {
    const closure = await ClosureModel.create({
      ...req.body,
      created_by: req.user!.userId,
    });

    // Auto-souscription : l'utilisateur est automatiquement abonné à sa propre période
    await SubscriptionModel.create({
      user_id: req.user!.userId,
      closure_period_id: closure.id,
    });

    res.status(201).json(closure);
  },

  // Modifier sa propre période (avec vérification de propriété)
  async updateMine(req: Request, res: Response): Promise<void> {
    const existing = await ClosureModel.findById(req.params.id);
    if (!existing || existing.created_by !== req.user!.userId) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }
    const closure = await ClosureModel.update(req.params.id, req.body);
    if (!closure) {
      res.status(404).json({ error: 'Période non trouvée' });
      return;
    }
    res.json(closure);
  },

  // Supprimer sa propre période (avec vérification de propriété)
  async deleteMine(req: Request, res: Response): Promise<void> {
    const existing = await ClosureModel.findById(req.params.id);
    if (!existing || existing.created_by !== req.user!.userId) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }
    await ClosureModel.delete(req.params.id);
    res.status(204).send();
  },
};
