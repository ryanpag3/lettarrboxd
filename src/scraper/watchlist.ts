import * as cheerio from 'cheerio';
import { LetterboxdMovie, LETTERBOXD_BASE_URL } from ".";
import { getMovie } from './movie';
import logger from '../util/logger';

export async function getMovies(url: string): Promise<LetterboxdMovie[]> {
    const allMovieLinks = await getAllMovieLinks(url);
    const movies: LetterboxdMovie[] = [];
    
    for (const link of allMovieLinks) {
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const movie = await getMovie(link);
            movies.push(movie);
        } catch (error) {
            console.warn(`Failed to fetch movie ${link}:`, error);
        }
    }
    
    return movies;
}

async function getAllMovieLinks(baseUrl: string): Promise<string[]> {
    let currentUrl: string | null = baseUrl;
    const allLinks: string[] = [];
    
    while (currentUrl) {
        console.log(`Fetching page: ${currentUrl}`);
        
        const response = await fetch(currentUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch watchlist page: ${response.status}`);
        }
        
        const html = await response.text();
        const pageLinks = getMovieLinksFromHtml(html);
        allLinks.push(...pageLinks);
        
        currentUrl = getNextPageUrl(html);
        
        if (currentUrl) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    logger.debug(`Retrieved ${allLinks.length} links from letterboxd.`);

    return allLinks;
}

function getMovieLinksFromHtml(html: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    
    $('.film-poster').each((_, element) => {
        const filmLink = $(element).attr('data-target-link');
        if (filmLink) {
            links.push(filmLink);
        }
    });
    logger.debug(`Found ${links.length} links.`);
    return links;
}

function getNextPageUrl(html: string): string | null {
    const $ = cheerio.load(html);
    const nextLink = $('.paginate-nextprev .next').attr('href');
    
    if (nextLink) {
        return new URL(nextLink, LETTERBOXD_BASE_URL).toString();
    }
    
    return null;
}