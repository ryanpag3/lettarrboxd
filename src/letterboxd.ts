import Axios from 'axios';
import * as cheerio from 'cheerio';
import env from './env';

const axios = Axios.create();

interface Movie {
    url: string;
    tmdbId?: string;
}

function extractMovieUrlsFromHtml(html: string): string[] {
    const $ = cheerio.load(html);
    const urls: string[] = [];
    
    $('.poster-container').each((_, element) => {
        const $container = $(element);
        const $filmPoster = $container.find('.film-poster');
        
        // Get the URL from data-target-link attribute
        const url = $filmPoster.attr('data-target-link') || '';
        
        if (url) {
            urls.push(url.startsWith('http') ? url : `https://letterboxd.com${url}`);
        }
    });
    
    return urls;
}

async function getTmdbIdFromMoviePage(url: string): Promise<string | null> {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        // Look for TMDB ID in various possible locations
        const tmdbLink = $('a[href*="themoviedb.org/movie/"]').attr('href');
        if (tmdbLink) {
            const match = tmdbLink.match(/\/movie\/(\d+)/);
            if (match) {
                return match[1];
            }
        }
        
        // Alternative: look for data attributes that might contain TMDB ID
        const tmdbId = $('[data-tmdb-id]').attr('data-tmdb-id');
        if (tmdbId) {
            return tmdbId;
        }
        
        return null;
    } catch (error) {
        console.error(`Error fetching TMDB ID for ${url}:`, error);
        return null;
    }
}

async function getAllWatchlistUrls(): Promise<string[]> {
    const allUrls: string[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
        const watchListUrl = `https://letterboxd.com/${env.LETTERBOXD_USERNAME}/watchlist/page/${page}/`;
        console.log(`Fetching page ${page}: ${watchListUrl}`);
        
        try {
            const response = await axios.get(watchListUrl);
            const urls = extractMovieUrlsFromHtml(response.data);
            
            if (urls.length === 0) {
                hasMorePages = false;
            } else {
                allUrls.push(...urls);
                page++;
                
                // Check if there's a next page link
                const $ = cheerio.load(response.data);
                const nextPageExists = $('.next').length > 0;
                if (!nextPageExists) {
                    hasMorePages = false;
                }
            }
            
            // Add delay between page requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Error fetching page ${page}:`, error);
            hasMorePages = false;
        }
    }
    
    return allUrls;
}

export async function getWatchlistMovies(): Promise<Movie[]> {
    const urls = await getAllWatchlistUrls();
    
    console.log('Total movies found across all pages:', urls.length);
    
    // Limit to first 5 movies in development mode
    const urlsToProcess = env.NODE_ENV === 'development' ? urls.slice(0, 5) : urls;
    
    if (env.NODE_ENV === 'development') {
        console.log(`Development mode: processing only first ${urlsToProcess.length} movies`);
    }
    
    const movies: Movie[] = [];
    
    for (const url of urlsToProcess) {
        console.log(`Fetching TMDB ID for: ${url}`);
        const tmdbId = await getTmdbIdFromMoviePage(url);
        
        movies.push({
            url,
            tmdbId: tmdbId || undefined
        });
        
        // Add a small delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Movies with TMDB IDs:', movies);
    return movies;
}