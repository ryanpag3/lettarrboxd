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

function extractTmdbId($: cheerio.CheerioAPI): string | null {
    const tmdbLink = $('a[data-track-action="TMDB"]').attr('href');
    if (!tmdbLink) {
        logger.debug('Could not find TMDB link. This could happen if there is a TV show in the list.');
        return null;
    }

    const tmdbMatch = tmdbLink.match(/\/movie\/(\d+)/);
    if (!tmdbMatch) {
        logger.debug('Could not extract TMDB ID from link. This could happen because there is a TV show in the list.');
        return null;
    }

    return tmdbMatch[1];
}

function extractImdbId($: cheerio.CheerioAPI): string | null {
    const imdbLink = $('a[href*="imdb.com"]').attr('href');
    if (!imdbLink) {
        logger.debug('Could not find IMDB link. This could happen if there is a TV show in the list or the movie lacks IMDB data.');
        return null;
    }

    const imdbMatch = imdbLink.match(/\/title\/(tt\d+)/);
    if (!imdbMatch) {
        logger.debug('Could not extract IMDB ID from link. This could happen because of an unexpected IMDB URL format.');
        return null;
    }

    return imdbMatch[1];
}

function extractLetterboxdId($: cheerio.CheerioAPI): number {
    const posterElement = $('div[data-resolvable-poster-path]').first();
    const filmIdAttribute = posterElement.attr('data-resolvable-poster-path');

    try {
        const parsedFilmData: unknown = JSON.parse(filmIdAttribute || '{}');
        if (
            typeof parsedFilmData !== 'object' ||
            parsedFilmData === null ||
            !('postered' in parsedFilmData)
        ) {
            throw new Error('Missing `postered` field in resolvable poster data.');
        }
        const postedData = parsedFilmData.postered;
        if (
            typeof postedData !== 'object' ||
            postedData === null ||
            !('uid' in postedData) ||
            typeof postedData.uid !== 'string'
        ) {
            throw new Error('Missing `postered.uid` string in resolvable poster data.');
        }
        const filmUid = postedData.uid.replace(/^film:/, '');
        const filmId = parseInt(filmUid, 10);
        if (!Number.isInteger(filmId)) {
            logger.error('Extracted Letterboxd ID is not a valid integer.', { filmId });
            throw new Error('Extracted Letterboxd ID is not a valid integer.');
        }
        return filmId;
    } catch (error) {
        logger.error('Failed to extract Letterboxd ID from HTML. This could be due to an unexpected HTML structure or missing data.', { error });
        throw new Error('Failed to extract Letterboxd ID from HTML.');
    }
}

function extractPublishedYear($: cheerio.CheerioAPI): number | null {
    const releaseDateLink = $('span.releasedate a').attr('href');
    if (releaseDateLink) {
        const yearMatch = releaseDateLink.match(/\/(\d{4})\//);
        if (yearMatch) {
            return parseInt(yearMatch[1], 10);
        }
    }

    logger.debug('Could not extract published year. This could happen if the release date format is unexpected or missing.');
    return null;
}