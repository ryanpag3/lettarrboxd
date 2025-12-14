require('dotenv').config();


import env from './util/env';
import logger from './util/logger';
import { fetchMoviesFromUrl } from './scraper';
import { upsertMovies } from './api/radarr';

function startScheduledMonitoring(): void {
  const intervalMs = env.CHECK_INTERVAL_MINUTES * 60 * 1000;

  logger.info(`Starting scheduled monitoring. Will check every ${env.CHECK_INTERVAL_MINUTES} minutes.`);

  // Run immediately on startup
  run();

  // Then run on interval
  setInterval(async () => {
    await run();
  }, intervalMs);
}

async function run() {
  const movies = await fetchMoviesFromUrl(env.LETTERBOXD_URL);
  await upsertMovies(movies);
}

export async function main() {
  startScheduledMonitoring();
}

export { startScheduledMonitoring };

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch(logger.error);
}