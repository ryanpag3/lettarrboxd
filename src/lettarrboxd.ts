import { getWatchlistMovies } from "./letterboxd";
import logger from "./logger";
import { addMovie, checkMovieInRadarr, lookupMovieInRadarr } from "./radarr";
import env from './env';
import fs from 'fs';
import path from 'path';

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
      logger.debug('No previous movies.json found, treating all movies as new');
      return [];
    }

    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const moviesData: MoviesData = JSON.parse(fileContent);

    logger.debug(`Found ${moviesData.movies.length} movies in previous run (${moviesData.queryDate})`);
    return moviesData.movies;
  } catch (error) {
    logger.error('Error reading previous movies:', error);
    return [];
  }
}

function findNewMovies(currentMovies: Movie[], previousMovies: Movie[]): Movie[] {
  const previousUrls = new Set(previousMovies.map(movie => movie.url));
  const newMovies = currentMovies.filter(movie => !previousUrls.has(movie.url));

  logger.debug(`Found ${newMovies.length} new movies out of ${currentMovies.length} total movies`);
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
    logger.debug(`Movies saved to: ${filePath}`);
    logger.debug(`Query completed at: ${moviesData.timestamp}`);
  } catch (error) {
    logger.error('Error writing movies to file:', error);
    throw error;
  }
}

async function addMovieToRadarr(movie: Movie): Promise<void> {
  if (!movie.tmdbId) {
    logger.warn('TMDB ID not found for movie');
    return;
  }

  logger.info(`\n--- Processing new movie: ${movie.url} (TMDB: ${movie.tmdbId}) ---`);

  const existingMovie = await checkMovieInRadarr(movie.tmdbId);
  
  if (existingMovie && existingMovie.length > 0) {
    logger.info(`Movie already exists in Radarr: ${existingMovie[0].title}`);
    return;
  }

  logger.info('Movie not found in Radarr, looking up details...');
  const movieDetails = await lookupMovieInRadarr(movie.tmdbId);

  if (movieDetails) {
    logger.info('Adding movie to Radarr...');
    await addMovie(movie.tmdbId, movieDetails);
  } else {
    logger.warn('Could not lookup movie details, skipping addition');
  }
}

async function processNewMovies(newMovies: Movie[]): Promise<void> {
  logger.info(`Processing ${newMovies.length} new movies for Radarr...`);
  
  for (const movie of newMovies) {
    await addMovieToRadarr(movie);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function logWatchlistStart(): Date {
  const startTime = new Date();
  logger.debug(`\n=== Starting watchlist check at ${startTime.toISOString()} ===`);
  return startTime;
}

function logWatchlistComplete(startTime: Date): void {
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  logger.debug(`=== Watchlist check completed in ${duration}s at ${endTime.toISOString()} ===`);
}

export async function processWatchlist(): Promise<void> {
  try {
    const startTime = logWatchlistStart();
    
    const currentMovies = await getWatchlistMovies();
    const previousMovies = await readPreviousMovies();
    const newMovies = findNewMovies(currentMovies, previousMovies);

    if (newMovies.length === 0) {
      logger.debug('No new movies found, skipping Radarr processing');
    } else {
      await processNewMovies(newMovies);
    }

    await writeMoviesToFile(currentMovies);
    logWatchlistComplete(startTime);
  } catch (error) {
    logger.error('Error during watchlist processing:', error);
  }
}