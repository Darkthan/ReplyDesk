import pLimit from 'p-limit';
import { config } from '../config';
import { UserModel } from '../models/user.model';
import { processUserAutoReply } from './autoreply.service';
import { logger } from '../utils/logger';

const limit = pLimit(5);
let intervalId: ReturnType<typeof setInterval> | null = null;

async function pollOnce(): Promise<void> {
  logger.debug('Polling started');

  try {
    const subscriptions = await UserModel.findActiveWithSubscriptions();

    if (subscriptions.length === 0) {
      logger.debug('No active subscriptions to process');
      return;
    }

    logger.info(`Processing ${subscriptions.length} active subscription(s)`);

    const tasks = subscriptions.map(sub =>
      limit(() => processUserAutoReply(sub))
    );

    await Promise.allSettled(tasks);
    logger.debug('Polling cycle completed');
  } catch (err) {
    logger.error('Polling error', { error: (err as Error).message });
  }
}

export function startPolling(): void {
  if (intervalId) return;

  logger.info(`Starting IMAP polling every ${config.pollingIntervalMs}ms`);

  // Run immediately, then on interval
  pollOnce();
  intervalId = setInterval(pollOnce, config.pollingIntervalMs);
}

export function stopPolling(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Polling stopped');
  }
}
