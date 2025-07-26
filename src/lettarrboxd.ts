// import { getWatchlistMovies } from "./scraper/watchlist";
// import logger from "./util/logger";
// import { addMovie, checkMovieInRadarr, lookupMovieInRadarr } from "./api/radarr";

// interface Movie {
//   url: string;
//   tmdbId?: string;
// }

// async function addMovieToRadarr(movie: Movie): Promise<void> {
//   if (!movie.tmdbId) {
//     logger.warn('TMDB ID not found for movie');
//     return;
//   }

//   logger.info(`\n--- Processing new movie: ${movie.url} (TMDB: ${movie.tmdbId}) ---`);

//   const existingMovie = await checkMovieInRadarr(movie.tmdbId);
  
//   if (existingMovie && existingMovie.length > 0) {
//     logger.info(`Movie already exists in Radarr: ${existingMovie[0].title}`);
//     return;
//   }

//   logger.info('Movie not found in Radarr, looking up details...');
//   const movieDetails = await lookupMovieInRadarr(movie.tmdbId);

//   if (movieDetails) {
//     logger.info('Adding movie to Radarr...');
//     await addMovie(movie.tmdbId, movieDetails);
//   } else {
//     logger.warn('Could not lookup movie details, skipping addition');
//   }
// }

// async function processMovies(movies: Movie[]): Promise<void> {
//   logger.info(`Processing ${movies.length} movies for Radarr...`);
  
//   for (const movie of movies) {
//     await addMovieToRadarr(movie);
//     await new Promise(resolve => setTimeout(resolve, 1000));
//   }
// }

// function logWatchlistStart(): Date {
//   const startTime = new Date();
//   logger.debug(`\n=== Starting watchlist check at ${startTime.toISOString()} ===`);
//   return startTime;
// }

// function logWatchlistComplete(startTime: Date): void {
//   const endTime = new Date();
//   const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
//   logger.debug(`=== Watchlist check completed in ${duration}s at ${endTime.toISOString()} ===`);
// }

// export async function processWatchlist(): Promise<void> {
//   try {
//     const startTime = logWatchlistStart();
    
//     const movies = await getWatchlistMovies();

//     if (movies.length === 0) {
//       logger.debug('No movies found in watchlist');
//     } else {
//       await processMovies(movies);
//     }

//     logWatchlistComplete(startTime);
//   } catch (error) {
//     logger.error('Error during watchlist processing:', error);
//   }
// }