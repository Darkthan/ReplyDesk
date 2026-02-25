import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';

export const UsersController = {
  async list(_req: Request, res: Response): Promise<void> {
    const users = await UserModel.findAll();
    res.json(users);
  },

  async update(req: Request, res: Response): Promise<void> {
    const { role } = req.body;
    const user = await UserModel.updateRole(req.params.id, role);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    res.json(user);
  },

  async delete(req: Request, res: Response): Promise<void> {
    const deleted = await UserModel.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    res.status(204).send();
  },
};
