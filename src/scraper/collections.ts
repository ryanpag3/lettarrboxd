import * as cheerio from 'cheerio';
import Bluebird from 'bluebird';
import { LetterboxdMovie, LETTERBOXD_BASE_URL } from ".";
import { getMovie } from './movie';
import logger from '../util/logger';
import Scraper from './scraper.interface';
import { fetchHtml } from '../util/http-client';

export class CollectionsScraper implements Scraper {
    constructor(private url: string, private take?: number, private strategy?: 'oldest' | 'newest') {}

    async getMovies(): Promise<LetterboxdMovie[]> {
        // For oldest strategy, modify the original URL before transforming to AJAX
        let urlToTransform = this.url;

        if (this.strategy === 'oldest') {
            // Add sorting to the base URL before transforming
            // /films/in/collection/ -> /films/in/collection/by/release-earliest/
            urlToTransform = this.url.replace(/\/$/, '') + '/by/release-earliest/';
        }

        // Transform URL to AJAX endpoint
        // /films/in/collection-name/ -> /films/ajax/popular/in/collection-name/
        const processUrl = this.transformToAjaxUrl(urlToTransform);

        const allMovieLinks = await this.getAllMovieLinks(processUrl);
        const linksToProcess = typeof this.take === 'number' ? allMovieLinks.slice(0, this.take) : allMovieLinks;

        const movies = await Bluebird.map(linksToProcess, link => {
            return getMovie(link);
        }, {
            concurrency: 10
        });

        return movies;
    }

    private transformToAjaxUrl(url: string): string {
        // Remove trailing slash for easier manipulation
        const cleanUrl = url.replace(/\/$/, '');

        // Transform /films/in/collection-name to /films/ajax/in/collection-name
        // Also handles URLs with sorting like /films/in/collection/by/release-earliest
        if (cleanUrl.includes('/films/in/')) {
            return cleanUrl.replace('/films/in/', '/films/ajax/in/') + '/';
        }

        // If already an AJAX URL, return as is
        if (cleanUrl.includes('/films/ajax/')) {
            return cleanUrl + '/';
        }

        throw new Error(`Unsupported collections URL format: ${url}`);
    }

    private async getAllMovieLinks(baseUrl: string): Promise<string[]> {
        let currentUrl: string | null = baseUrl;
        const allLinks: string[] = [];

        while (currentUrl) {
            logger.debug(`Fetching collections page: ${currentUrl}`);

            const response = await fetchHtml(currentUrl);
            const html = response.html;
            const pageLinks = this.getMovieLinksFromHtml(html);
            allLinks.push(...pageLinks);

            currentUrl = this.getNextPageUrl(html);

            if (currentUrl) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        logger.debug(`Retrieved ${allLinks.length} links from letterboxd collection.`);

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

        if (nextLink) {
            return new URL(nextLink, LETTERBOXD_BASE_URL).toString();
        }

        return null;
    }
}
