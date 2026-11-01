import * as cheerio from 'cheerio';
import { fetchPage } from './fetch';
import Bluebird from 'bluebird';
import { LetterboxdMovie, LETTERBOXD_BASE_URL } from ".";
import { getMovie } from './movie';
import logger from '../util/logger';
import Scraper from './scraper.interface';

export class PopularScraper implements Scraper {
    constructor(private url: string, private take?: number, private strategy?: 'oldest' | 'newest') {}

    async getMovies(): Promise<LetterboxdMovie[]> {
        const listUrl = this.transformToListUrl(this.url);

        const allMovieLinks = await this.getAllMovieLinks(listUrl);
        const linksToProcess = typeof this.take === 'number' ? allMovieLinks.slice(0, this.take) : allMovieLinks;

        const movies = await Bluebird.map(linksToProcess, link => {
            return getMovie(link);
        }, {
            concurrency: 10
        });

        return movies;
    }

    private transformToListUrl(url: string): string {
        // Remove trailing slash for easier manipulation
        const cleanUrl = url.replace(/\/$/, '');

        // The /films/popular page loads its films from a separate list endpoint
        if (cleanUrl === `${LETTERBOXD_BASE_URL}/films/popular`) {
            return buildPopularListUrl(1);
        }

        throw new Error(`Unsupported popular movies URL format: ${url}`);
    }

    private async getAllMovieLinks(baseUrl: string): Promise<string[]> {
        let currentUrl: string | null = baseUrl;
        const allLinks: string[] = [];

        while (currentUrl) {
            logger.debug(`Fetching popular movies page: ${currentUrl}`);

            const response = await fetchPage(currentUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch popular movies page: ${response.status}`);
            }

            const html = await response.text();
            const pageLinks = this.getMovieLinksFromHtml(html);
            allLinks.push(...pageLinks);

            // The popular list is effectively endless, so stop once we have enough
            if (typeof this.take === 'number' && allLinks.length >= this.take) {
                break;
            }

            currentUrl = this.getNextPageUrl(html);

            if (currentUrl) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        logger.debug(`Retrieved ${allLinks.length} links from popular movies.`);

        return allLinks;
    }

    private getMovieLinksFromHtml(html: string): string[] {
        const $ = cheerio.load(html);
        const links: string[] = [];

        $('.react-component[data-target-link]').each((_, element) => {
            const filmLink = $(element).attr('data-target-link');
            if (filmLink) {
                links.push(filmLink);
            }
        });
        logger.debug(`Found ${links.length} links.`);
        return links;
    }

    private getNextPageUrl(html: string): string | null {
        const $ = cheerio.load(html);
        const nextLink = $('.paginate-nextprev .next').attr('href');
        const pageMatch = nextLink?.match(/\/page\/(\d+)\/?$/);

        if (pageMatch) {
            return buildPopularListUrl(parseInt(pageMatch[1], 10));
        }

        return null;
    }
}

/**
 * Next links point at /films/popular/page/N/, which only renders a shell,
 * so map them onto the list endpoint the page loads its films from.
 */
function buildPopularListUrl(page: number): string {
    const pagePath = page > 1 ? `page/${page}/` : '';
    return `${LETTERBOXD_BASE_URL}/csi/films/films-browser-list/popular/${pagePath}?esiAllowFilters=true`;
}
