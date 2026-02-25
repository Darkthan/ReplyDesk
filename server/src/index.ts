import app from './app';
import { config } from './config';
import { testConnection, runMigrations } from './config/database';
import { startPolling } from './services/polling.service';
import { logger } from './utils/logger';

async function main() {
  try {
    await testConnection();
    await runMigrations();

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });

    startPolling();
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

main();
