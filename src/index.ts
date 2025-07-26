require('dotenv').config();

import env from './util/env';
import logger from './util/logger';
import { fetchMoviesFromUrl } from './scraper';

function startScheduledMonitoring(): void {
  const intervalMinutes = env.CHECK_INTERVAL_MINUTES;
  const intervalMs = intervalMinutes * 60 * 1000;
  setInterval(() => {
    fetchMoviesFromUrl(env.LETTERBOXD_URL);
  }, intervalMs);
}

export async function main() {
  startScheduledMonitoring();
}

export { startScheduledMonitoring };

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch(logger.error);
}