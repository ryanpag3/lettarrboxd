import * as cheerio from 'cheerio';
import { LETTERBOXD_BASE_URL, LetterboxdMovie } from ".";
import logger from '../util/logger';

/**
 * Obtain details of a movie.
 * @param link - This is the 'data-film-link' property on the movie div in letterboxd.
 */
export async function getMovie(link: string): Promise<LetterboxdMovie> {
    const movieUrl = new URL(link, LETTERBOXD_BASE_URL).toString();
    
    const response = await fetch(movieUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch movie page: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    return extractMovieFromHtml(link, html);
}

function extractMovieFromHtml(slug: string, html: string): LetterboxdMovie {
    const $ = cheerio.load(html);
    
    const name = extractName($);
    const tmdbId = extractTmdbId($);
    const imdbId = extractImdbId($);
    const id = extractLetterboxdId($);
    const year = extractPublishedYear($);
    
    const letterboxdResult = {
        id,
        name,
        imdbId,
        tmdbId,
        publishedYear: year,
        slug
    };

    return letterboxdResult;
}

function extractName($: cheerio.CheerioAPI): string {
    const name = $('.primaryname').first().text().trim();
    return name;
}

function extractTmdbId($: cheerio.CheerioAPI): string {
    const tmdbLink = $('a[data-track-action="TMDB"]').attr('href');
    if (!tmdbLink) {
        throw new Error('Could not find TMDB link');
    }
    
    const tmdbMatch = tmdbLink.match(/\/movie\/(\d+)/);
    if (!tmdbMatch) {
        throw new Error('Could not extract TMDB ID from link');
    }
    
    return tmdbMatch[1];
}

function extractImdbId($: cheerio.CheerioAPI): string {
    const imdbLink = $('a[href*="imdb.com"]').attr('href');
    if (!imdbLink) {
        throw new Error('Could not find IMDB link');
    }
    
    const imdbMatch = imdbLink.match(/\/title\/(tt\d+)/);
    if (!imdbMatch) {
        throw new Error('Could not extract IMDB ID from link');
    }
    
    return imdbMatch[1];
}

function extractLetterboxdId($: cheerio.CheerioAPI): number {
    const filmId = $('.film-poster').attr('data-film-id');
    if (!filmId) {
        throw new Error('Could not find Letterboxd film ID');
    }
    
    return parseInt(filmId, 10);
}

function extractPublishedYear($: cheerio.CheerioAPI): number {
    const releaseDateLink = $('span.releasedate a').attr('href');
    if (releaseDateLink) {
        const yearMatch = releaseDateLink.match(/\/(\d{4})\//);
        if (yearMatch) {
            return parseInt(yearMatch[1], 10);
        }
    }
    
    throw new Error('Could not extract published year');
}