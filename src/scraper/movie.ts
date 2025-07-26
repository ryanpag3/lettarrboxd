import * as cheerio from 'cheerio';
import { LETTERBOXD_BASE_URL, LetterboxdMovie } from ".";

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
    
    const jsonLdScript = $('script[type="application/ld+json"]').first().html();
    if (!jsonLdScript) {
        throw new Error('Could not find JSON-LD structured data');
    }
    
    const movieData = JSON.parse(jsonLdScript);
    
    const name = movieData.name;
    if (!name) {
        throw new Error('Could not extract movie name');
    }
    
    const tmdbId = extractTmdbId($);
    const imdbId = extractImdbId(movieData);
    const id = extractLetterboxdId($);
    const year = extractPublishedYear($);
    
    return {
        id,
        name,
        imdbId,
        tmdbId,
        publishedYear: year,
        slug
    };
}

function extractTmdbId($: cheerio.CheerioAPI): string {
    const tmdbLink = $('a[data-track-action="TMDb"]').attr('href');
    if (!tmdbLink) {
        throw new Error('Could not find TMDB link');
    }
    
    const tmdbMatch = tmdbLink.match(/\/movie\/(\d+)/);
    if (!tmdbMatch) {
        throw new Error('Could not extract TMDB ID from link');
    }
    
    return tmdbMatch[1];
}

function extractImdbId(movieData: any): string {
    const imdbUrl = movieData.sameAs?.find((url: string) => url.includes('imdb.com'));
    if (!imdbUrl) {
        throw new Error('Could not find IMDB URL in structured data');
    }
    
    const imdbMatch = imdbUrl.match(/\/title\/(tt\d+)/);
    if (!imdbMatch) {
        throw new Error('Could not extract IMDB ID from URL');
    }
    
    return imdbMatch[1];
}

function extractLetterboxdId($: cheerio.CheerioAPI): number {
    const filmId = $('body').attr('data-film-id');
    if (!filmId) {
        throw new Error('Could not find Letterboxd film ID');
    }
    
    return parseInt(filmId, 10);
}

function extractPublishedYear($: cheerio.CheerioAPI): number {
    const releaseYear = $('.release-year').text().trim();
    if (releaseYear) {
        const year = parseInt(releaseYear, 10);
        if (!isNaN(year)) {
            return year;
        }
    }
    
    throw new Error('Could not extract published year');
}