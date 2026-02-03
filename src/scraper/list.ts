import * as cheerio from 'cheerio';
import Bluebird from 'bluebird';
import { LetterboxdMovie, LETTERBOXD_BASE_URL } from ".";
import { getMovie } from './movie';
import logger from '../util/logger';
import Scraper from './scraper.interface';
import { fetchHtml } from '../util/http-client';

export class ListScraper implements Scraper {
    constructor(private url: string, private take?: number, private strategy?: 'oldest' | 'newest') {}

    async getMovies(): Promise<LetterboxdMovie[]> {
        let processUrl = this.url;
        
        if (this.strategy === 'oldest') {
            processUrl = this.url.replace(/\/$/, '') + '/by/date-earliest/';
        }
        
        const allMovieLinks = await this.getAllMovieLinks(processUrl);
        const linksToProcess = typeof this.take === 'number' ? allMovieLinks.slice(0, this.take) : allMovieLinks;

        const movies = await Bluebird.map(linksToProcess, link => {
            return getMovie(link);
        }, {
            concurrency: 10
        });
        
        return movies;
    }

    private async getAllMovieLinks(baseUrl: string): Promise<string[]> {
        let currentUrl: string | null = baseUrl;
        const allLinks: string[] = [];
        
        while (currentUrl) {
            logger.debug(`Fetching page: ${currentUrl}`);

            const response = await fetchHtml(currentUrl);
            const html = response.html;
            const pageLinks = this.getMovieLinksFromHtml(html);
            allLinks.push(...pageLinks);
            
            currentUrl = this.getNextPageUrl(html);
            
            if (currentUrl) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        logger.debug(`Retrieved ${allLinks.length} links from letterboxd list.`);

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