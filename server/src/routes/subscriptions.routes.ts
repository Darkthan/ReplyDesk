import { Router } from 'express';
import { z } from 'zod';
import { SubscriptionsController } from '../controllers/subscriptions.controller';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const createSubscriptionSchema = z.object({
  closure_period_id: z.string().uuid('ID de période invalide'),
  custom_subject: z.string().optional(),
  custom_message: z.string().optional(),
});

const updateSubscriptionSchema = z.object({
  custom_subject: z.string().nullable().optional(),
  custom_message: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

router.use(authMiddleware);

router.get('/', asyncHandler(SubscriptionsController.list));
router.post('/', validate(createSubscriptionSchema), asyncHandler(SubscriptionsController.create));
router.put('/:id', validate(updateSubscriptionSchema), asyncHandler(SubscriptionsController.update));
router.delete('/:id', asyncHandler(SubscriptionsController.delete));

export default router;
