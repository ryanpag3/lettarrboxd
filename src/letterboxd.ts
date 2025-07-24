import Axios from 'axios';
import * as cheerio from 'cheerio';
import env from './env';
import logger from './logger';

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
        
        const tmdbLink = $('a[href*="themoviedb.org/movie/"]').attr('href');
        if (tmdbLink) {
            const match = tmdbLink.match(/\/movie\/(\d+)/);
            if (match) {
                return match[1];
            }
        }
        
        const tmdbId = $('[data-tmdb-id]').attr('data-tmdb-id');
        if (tmdbId) {
            return tmdbId;
        }
        
        return null;
    } catch (error) {
        logger.error(`Error fetching TMDB ID for ${url}:`, error);
        return null;
    }
}

async function getAllWatchlistUrls(): Promise<string[]> {
    const allUrls: string[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
        const watchListUrl = `https://letterboxd.com/${env.LETTERBOXD_USERNAME}/watchlist/page/${page}/`;
        logger.info(`Fetching page ${page}: ${watchListUrl}`);
        
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
            
            // So we don't get in trouble
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            logger.error(`Error fetching page ${page}:`, error);
            hasMorePages = false;
        }
    }
    
    return allUrls;
}

function applyMovieLimiting(urls: string[]): string[] {
    // Development mode takes precedence
    if (env.NODE_ENV === 'development') {
        logger.info(`Development mode: processing only first 5 movies`);
        return urls.slice(0, 5);
    }
    
    // Apply movie limiting based on new strategy
    if (env.LETTERBOXD_TAKE_AMOUNT && env.LETTERBOXD_TAKE_STRATEGY) {
        logger.info(`Limiting to ${env.LETTERBOXD_TAKE_STRATEGY} ${env.LETTERBOXD_TAKE_AMOUNT} movies`);
        
        if (env.LETTERBOXD_TAKE_STRATEGY === 'newest') {
            return urls.slice(0, env.LETTERBOXD_TAKE_AMOUNT);
        } else if (env.LETTERBOXD_TAKE_STRATEGY === 'oldest') {
            return urls.slice(-env.LETTERBOXD_TAKE_AMOUNT);
        }
    }
    
    return urls;
}

export async function getWatchlistMovies(): Promise<Movie[]> {
    const urls = await getAllWatchlistUrls();
    
    logger.info('Total movies found across all pages:', urls.length);
    
    const urlsToProcess = applyMovieLimiting(urls);
    
    const movies: Movie[] = [];
    
    for (const url of urlsToProcess) {
        logger.debug(`Fetching TMDB ID for: ${url}`);
        const tmdbId = await getTmdbIdFromMoviePage(url);
        
        movies.push({
            url,
            tmdbId: tmdbId || undefined
        });
        
        // Add a small delay so we don't get in trouble
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    logger.debug('Movies with TMDB IDs:', movies);
    return movies;
}