require('dotenv').config();


import schedule from 'node-schedule';
import env from './util/env';
import logger from './util/logger';
import { fetchMoviesFromUrl } from './scraper';
import { upsertMovies } from './api/radarr';

function startScheduledMonitoring(): void {

  const rule = new schedule.RecurrenceRule();
  rule.minute = env.CHECK_INTERVAL_MINUTES;

  run();

  const job = schedule.scheduleJob(rule, async () => {
    await run();
  });
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