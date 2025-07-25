require('dotenv').config();

import env from './util/env';
import logger from './util/logger';
import { processWatchlist } from './lettarrboxd';

function startScheduledMonitoring(): void {
  const intervalMinutes = env.CHECK_INTERVAL_MINUTES;
  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info(`Starting scheduled monitoring every ${intervalMinutes} minutes`);
  logger.info(`Next check will be at: ${new Date(Date.now() + intervalMs).toISOString()}`);

  processWatchlist();

  setInterval(() => {
    logger.debug(`\n--- Scheduled check triggered (interval: ${intervalMinutes} minutes) ---`);
    processWatchlist();
  }, intervalMs);
}

export async function main() {
  logger.info('Lettarrboxd starting...');
  logger.info(`
    - Check interval: ${env.CHECK_INTERVAL_MINUTES}
    - Letterboxd user: ${env.LETTERBOXD_USERNAME}
    `);
  if (env.LETTERBOXD_TAKE_AMOUNT || env.LETTERBOXD_TAKE_STRATEGY) {
    logger.info(`
    - Take amount: ${env.LETTERBOXD_TAKE_AMOUNT}
    - Take strategy: ${env.LETTERBOXD_TAKE_STRATEGY}
    `)
  }
  startScheduledMonitoring();
}

export { processWatchlist, startScheduledMonitoring };

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch(logger.error);
}