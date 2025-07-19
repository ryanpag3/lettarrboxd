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

async function writeMoviesToFile(movies: Movie[]): Promise<void> {
    try {
        // Ensure DATA_DIR exists
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


console.log('Application starting with validated environment:', {
  NODE_ENV: env.NODE_ENV,
  LOG_LEVEL: env.LOG_LEVEL
});

async function main() {
    const movies = await getWatchlistMovies();
    
    // Lookup each movie in Radarr and add if not present
    for (const movie of movies) {
        if (movie.tmdbId) {
            console.log(`\n--- Processing movie: ${movie.url} (TMDB: ${movie.tmdbId}) ---`);
            
            // Check if movie exists in Radarr library
            const existingMovie = await checkMovieInRadarr(movie.tmdbId);
            
            if (existingMovie && existingMovie.length > 0) {
                console.log(`Movie already exists in Radarr: ${existingMovie[0].title}`);
            } else {
                console.log('Movie not found in Radarr, looking up details...');
                
                // Lookup movie details in Radarr
                const movieDetails = await lookupMovieInRadarr(movie.tmdbId);
                
                if (movieDetails) {
                    console.log('Adding movie to Radarr...');
                    await addMovie(movie.tmdbId, movieDetails);
                } else {
                    console.log('Could not lookup movie details, skipping addition');
                }
            }
            
            // Add delay between API calls
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log(`Skipping movie ${movie.url} - no TMDB ID found`);
        }
    }
    
    await writeMoviesToFile(movies);
}

main().catch(console.error);