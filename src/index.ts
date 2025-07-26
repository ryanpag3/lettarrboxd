require('dotenv').config();

import env from './util/env';
import logger from './util/logger';
import { processWatchlist } from './lettarrboxd';
import { fetchMoviesFromUrl } from './scraper';

function startScheduledMonitoring(): void {
  const intervalMinutes = env.CHECK_INTERVAL_MINUTES;
  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info(`Starting scheduled monitoring every ${intervalMinutes} minutes`);
  logger.info(`Next check will be at: ${new Date(Date.now() + intervalMs).toISOString()}`);

  fetchMoviesFromUrl(env.LETTERBOXD_URL);

  setInterval(() => {
    logger.debug(`\n--- Scheduled check triggered (interval: ${intervalMinutes} minutes) ---`);
    fetchMoviesFromUrl(env.LETTERBOXD_URL);
  }, intervalMs);
}

export async function main() {
  logger.info('Lettarrboxd starting...');
  logger.info(`
    - Check interval: ${env.CHECK_INTERVAL_MINUTES}
    - Letterboxd URL: ${env.LETTERBOXD_URL}
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