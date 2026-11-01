import * as cheerio from 'cheerio';
import { fetchPage } from './fetch';
import Bluebird from 'bluebird';
import { LetterboxdMovie, LETTERBOXD_BASE_URL } from ".";
import { getMovie } from './movie';
import logger from '../util/logger';
import Scraper from './scraper.interface';

export class CollectionsScraper implements Scraper {
    constructor(private url: string, private take?: number, private strategy?: 'oldest' | 'newest') {}

    async getMovies(): Promise<LetterboxdMovie[]> {
        let urlToProcess = this.url;

        if (this.strategy === 'oldest') {
            // /films/in/collection/ -> /films/in/collection/by/release-earliest/
            urlToProcess = this.url.replace(/\/$/, '') + '/by/release-earliest/';
        }

        const processUrl = this.normalizeUrl(urlToProcess);

        const allMovieLinks = await this.getAllMovieLinks(processUrl);
        const linksToProcess = typeof this.take === 'number' ? allMovieLinks.slice(0, this.take) : allMovieLinks;

        const movies = await Bluebird.map(linksToProcess, link => {
            return getMovie(link);
        }, {
            concurrency: 10
        });

        return movies;
    }

    private normalizeUrl(url: string): string {
        // Remove trailing slash for easier manipulation
        const cleanUrl = url.replace(/\/$/, '');

        // Also handles URLs with sorting like /films/in/collection/by/release-earliest
        if (cleanUrl.includes('/films/in/')) {
            return cleanUrl + '/';
        }

        throw new Error(`Unsupported collections URL format: ${url}`);
    }

    private async getAllMovieLinks(baseUrl: string): Promise<string[]> {
        let currentUrl: string | null = baseUrl;
        const allLinks: string[] = [];

        while (currentUrl) {
            logger.debug(`Fetching collections page: ${currentUrl}`);

            const response = await fetchPage(currentUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch collections page: ${response.status}`);
            }

            const html = await response.text();
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
