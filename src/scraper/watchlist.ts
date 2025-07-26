import * as cheerio from 'cheerio';
import Bluebird from 'bluebird';
import { LetterboxdMovie, LETTERBOXD_BASE_URL } from ".";
import { getMovie } from './movie';
import logger from '../util/logger';
import Scraper from './scraper.interface';

export class WatchlistScraper implements Scraper {
    constructor(private url: string, private take?: number | 'oldest') {}

    async getMovies(): Promise<LetterboxdMovie[]> {
        let processUrl = this.url;
        
        if (this.take === 'oldest') {
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
            
            const response = await fetch(currentUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch watchlist page: ${response.status}`);
            }
            
            const html = await response.text();
            const pageLinks = this.getMovieLinksFromHtml(html);
            allLinks.push(...pageLinks);
            
            currentUrl = this.getNextPageUrl(html);
            
            if (currentUrl) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        logger.debug(`Retrieved ${allLinks.length} links from letterboxd.`);

        return allLinks;
    }

    private getMovieLinksFromHtml(html: string): string[] {
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

    private getNextPageUrl(html: string): string | null {
        const $ = cheerio.load(html);
        const nextLink = $('.paginate-nextprev .next').attr('href');
        
        if (nextLink) {
            return new URL(nextLink, LETTERBOXD_BASE_URL).toString();
        }
        
        return null;
    }
}