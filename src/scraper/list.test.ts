import { ListScraper } from './list';
import * as movieModule from './movie';
import { fetchHtml } from '../util/http-client';

// Mock the logger
jest.mock('../util/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock the movie module
jest.mock('./movie');

// Mock the http-client module
jest.mock('../util/http-client');

describe('ListScraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMovies', () => {
    it('should fetch and parse movies from a single page', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="react-component" data-target-link="/film/movie1/"></div>
            <div class="react-component" data-target-link="/film/movie2/"></div>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const mockMovie1 = {
        id: 1,
        name: 'Movie 1',
        slug: '/film/movie1/',
        tmdbId: '123',
        imdbId: 'tt123',
        publishedYear: 2020,
      };

      const mockMovie2 = {
        id: 2,
        name: 'Movie 2',
        slug: '/film/movie2/',
        tmdbId: '456',
        imdbId: 'tt456',
        publishedYear: 2021,
      };

      (movieModule.getMovie as jest.Mock)
        .mockResolvedValueOnce(mockMovie1)
        .mockResolvedValueOnce(mockMovie2);

      const scraper = new ListScraper('https://letterboxd.com/user/watchlist/');
      const movies = await scraper.getMovies();

      expect(movies).toHaveLength(2);
      expect(movies[0]).toEqual(mockMovie1);
      expect(movies[1]).toEqual(mockMovie2);
      expect(fetchHtml).toHaveBeenCalledTimes(1);
    });

    it('should handle pagination across multiple pages', async () => {
      const page1Html = `
        <html>
          <body>
            <div class="react-component" data-target-link="/film/movie1/"></div>
            <div class="paginate-nextprev">
              <a class="next" href="/user/watchlist/page/2/">Next</a>
            </div>
          </body>
        </html>
      `;

      const page2Html = `
        <html>
          <body>
            <div class="react-component" data-target-link="/film/movie2/"></div>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock)
        .mockResolvedValueOnce({
          html: page1Html,
          statusCode: 200,
        })
        .mockResolvedValueOnce({
          html: page2Html,
          statusCode: 200,
        });

      const mockMovie1 = {
        id: 1,
        name: 'Movie 1',
        slug: '/film/movie1/',
        tmdbId: '123',
        imdbId: null,
        publishedYear: null,
      };

      const mockMovie2 = {
        id: 2,
        name: 'Movie 2',
        slug: '/film/movie2/',
        tmdbId: '456',
        imdbId: null,
        publishedYear: null,
      };

      (movieModule.getMovie as jest.Mock)
        .mockResolvedValueOnce(mockMovie1)
        .mockResolvedValueOnce(mockMovie2);

      const scraper = new ListScraper('https://letterboxd.com/user/watchlist/');
      const movies = await scraper.getMovies();

      expect(movies).toHaveLength(2);
      expect(fetchHtml).toHaveBeenCalledTimes(2);
      expect(fetchHtml).toHaveBeenNthCalledWith(
        2,
        'https://letterboxd.com/user/watchlist/page/2/'
      );
    });

    it('should limit movies when take parameter is provided', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="react-component" data-target-link="/film/movie1/"></div>
            <div class="react-component" data-target-link="/film/movie2/"></div>
            <div class="react-component" data-target-link="/film/movie3/"></div>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const mockMovie1 = {
        id: 1,
        name: 'Movie 1',
        slug: '/film/movie1/',
        tmdbId: '123',
        imdbId: null,
        publishedYear: null,
      };

      const mockMovie2 = {
        id: 2,
        name: 'Movie 2',
        slug: '/film/movie2/',
        tmdbId: '456',
        imdbId: null,
        publishedYear: null,
      };

      (movieModule.getMovie as jest.Mock)
        .mockResolvedValueOnce(mockMovie1)
        .mockResolvedValueOnce(mockMovie2);

      const scraper = new ListScraper('https://letterboxd.com/user/watchlist/', 2);
      const movies = await scraper.getMovies();

      expect(movies).toHaveLength(2);
      expect(movieModule.getMovie).toHaveBeenCalledTimes(2);
    });

    it('should modify URL when strategy is oldest', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="react-component" data-target-link="/film/movie1/"></div>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const mockMovie = {
        id: 1,
        name: 'Movie 1',
        slug: '/film/movie1/',
        tmdbId: '123',
        imdbId: null,
        publishedYear: null,
      };

      (movieModule.getMovie as jest.Mock).mockResolvedValueOnce(mockMovie);

      const scraper = new ListScraper(
        'https://letterboxd.com/user/watchlist/',
        undefined,
        'oldest'
      );
      await scraper.getMovies();

      expect(fetchHtml).toHaveBeenCalledWith(
        'https://letterboxd.com/user/watchlist/by/date-earliest/'
      );
    });

    it('should throw error when page fetch fails', async () => {
      (fetchHtml as jest.Mock).mockRejectedValueOnce(
        new Error('HTTP request failed: 500 Internal Server Error')
      );

      const scraper = new ListScraper('https://letterboxd.com/user/watchlist/');

      await expect(scraper.getMovies()).rejects.toThrow('HTTP request failed: 500 Internal Server Error');
    });

    it('should handle empty movie list', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="no-results">No movies found</div>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const scraper = new ListScraper('https://letterboxd.com/user/watchlist/');
      const movies = await scraper.getMovies();

      expect(movies).toHaveLength(0);
      expect(movieModule.getMovie).not.toHaveBeenCalled();
    });
  });
});
