require('dotenv').config();

import env from './env';
import logger from './logger';
import { processWatchlist } from './lettarrboxd';

function startScheduledMonitoring(): void {
  const intervalMinutes = env.CHECK_INTERVAL_MINUTES;
  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info(`Starting scheduled monitoring every ${intervalMinutes} minutes`);
  logger.info(`Next check will be at: ${new Date(Date.now() + intervalMs).toISOString()}`);

  processWatchlist();

  setInterval(() => {
    logger.info(`\n--- Scheduled check triggered (interval: ${intervalMinutes} minutes) ---`);
    processWatchlist();
  }, intervalMs);
}

export async function main() {
  logger.info('Lettarrboxd starting...');
  logger.info('Environment configuration:');
  logger.info(`- Check interval: ${env.CHECK_INTERVAL_MINUTES} minutes`);
  logger.info(`- Environment: ${env.NODE_ENV}`);
  logger.info(`- Letterboxd user: ${env.LETTERBOXD_USERNAME}`);

  startScheduledMonitoring();
}

export { processWatchlist, startScheduledMonitoring };

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch(logger.error);
}