require('dotenv').config();

import * as fs from 'fs';
import * as path from 'path';
import env from './env';
import { getWatchlistMovies } from './letterboxd';
import { lookupMovieInRadarr, checkMovieInRadarr, addMovie } from './radarr';

interface Movie {
  url: string;
  tmdbId?: string;
}

interface MoviesData {
  timestamp: string;
  queryDate: string;
  totalMovies: number;
  movies: Movie[];
}

async function readPreviousMovies(): Promise<Movie[]> {
  try {
    const filePath = path.join(env.DATA_DIR, 'movies.json');

    if (!fs.existsSync(filePath)) {
      console.log('No previous movies.json found, treating all movies as new');
      return [];
    }

    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const moviesData: MoviesData = JSON.parse(fileContent);

    console.log(`Found ${moviesData.movies.length} movies in previous run (${moviesData.queryDate})`);
    return moviesData.movies;
  } catch (error) {
    console.error('Error reading previous movies:', error);
    return [];
  }
}

function findNewMovies(currentMovies: Movie[], previousMovies: Movie[]): Movie[] {
  const previousUrls = new Set(previousMovies.map(movie => movie.url));
  const newMovies = currentMovies.filter(movie => !previousUrls.has(movie.url));

  console.log(`Found ${newMovies.length} new movies out of ${currentMovies.length} total movies`);
  return newMovies;
}

async function writeMoviesToFile(movies: Movie[]): Promise<void> {
  try {
    if (!fs.existsSync(env.DATA_DIR)) {
      fs.mkdirSync(env.DATA_DIR, { recursive: true });
    }

    const now = new Date();
    const moviesData: MoviesData = {
      timestamp: now.toISOString(),
      queryDate: now.toLocaleDateString(),
      totalMovies: movies.length,
      movies
    };

    const filePath = path.join(env.DATA_DIR, 'movies.json');
    const jsonData = JSON.stringify(moviesData, null, 2);

    await fs.promises.writeFile(filePath, jsonData, 'utf8');
    console.log(`Movies saved to: ${filePath}`);
    console.log(`Query completed at: ${moviesData.timestamp}`);
  } catch (error) {
    console.error('Error writing movies to file:', error);
    throw error;
  }
}

async function addMovieToRadarr(movie: Movie): Promise<void> {
  if (!movie.tmdbId) {
    console.log('TMDB ID not found for movie');
    return;
  }

  console.log(`\n--- Processing new movie: ${movie.url} (TMDB: ${movie.tmdbId}) ---`);

  const existingMovie = await checkMovieInRadarr(movie.tmdbId);
  
  if (existingMovie && existingMovie.length > 0) {
    console.log(`Movie already exists in Radarr: ${existingMovie[0].title}`);
    return;
  }

  console.log('Movie not found in Radarr, looking up details...');
  const movieDetails = await lookupMovieInRadarr(movie.tmdbId);

  if (movieDetails) {
    console.log('Adding movie to Radarr...');
    await addMovie(movie.tmdbId, movieDetails);
  } else {
    console.log('Could not lookup movie details, skipping addition');
  }
}

async function processNewMovies(newMovies: Movie[]): Promise<void> {
  console.log(`Processing ${newMovies.length} new movies for Radarr...`);
  
  for (const movie of newMovies) {
    await addMovieToRadarr(movie);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function logWatchlistStart(): Date {
  const startTime = new Date();
  console.log(`\n=== Starting watchlist check at ${startTime.toISOString()} ===`);
  return startTime;
}

function logWatchlistComplete(startTime: Date): void {
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  console.log(`=== Watchlist check completed in ${duration}s at ${endTime.toISOString()} ===`);
}

async function processWatchlist(): Promise<void> {
  try {
    const startTime = logWatchlistStart();
    
    const currentMovies = await getWatchlistMovies();
    const previousMovies = await readPreviousMovies();
    const newMovies = findNewMovies(currentMovies, previousMovies);

    if (newMovies.length === 0) {
      console.log('No new movies found, skipping Radarr processing');
    } else {
      await processNewMovies(newMovies);
    }

    await writeMoviesToFile(currentMovies);
    logWatchlistComplete(startTime);
  } catch (error) {
    console.error('Error during watchlist processing:', error);
  }
}

function startScheduledMonitoring(): void {
  const intervalMinutes = env.CHECK_INTERVAL_MINUTES;
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`Starting scheduled monitoring every ${intervalMinutes} minutes`);
  console.log(`Next check will be at: ${new Date(Date.now() + intervalMs).toISOString()}`);

  processWatchlist();

  setInterval(() => {
    console.log(`\n--- Scheduled check triggered (interval: ${intervalMinutes} minutes) ---`);
    processWatchlist();
  }, intervalMs);
}

async function main() {
  console.log('Watchlistarr starting...');
  console.log('Environment configuration:');
  console.log(`- Check interval: ${env.CHECK_INTERVAL_MINUTES} minutes`);
  console.log(`- Environment: ${env.NODE_ENV}`);
  console.log(`- Letterboxd user: ${env.LETTERBOXD_USERNAME}`);

  startScheduledMonitoring();
}

main().catch(console.error);