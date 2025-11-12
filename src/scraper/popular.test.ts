import { PopularScraper } from './popular';
import { getMovie } from './movie';

// Mock the logger
jest.mock('../util/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock the movie module
jest.mock('./movie');

// Mock global fetch
global.fetch = jest.fn();

describe('PopularScraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('URL transformation', () => {
    it('should transform popular URL to AJAX endpoint', async () => {
      const mockHtml = `
        <div class="react-component" data-target-link="/film/movie1/"></div>
        <div class="react-component" data-target-link="/film/movie2/"></div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      });

      (getMovie as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Movie',
        slug: '/film/movie1/',
        tmdbId: '123',
        imdbId: null,
        publishedYear: null,
      });

      const scraper = new PopularScraper('https://letterboxd.com/films/popular/', 2);
      await scraper.getMovies();

      // Verify fetch was called with AJAX URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://letterboxd.com/films/ajax/popular/'
      );
    });

    it('should handle URLs without trailing slash', async () => {
      const mockHtml = `
        <div class="react-component" data-target-link="/film/movie1/"></div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      });

      (getMovie as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Movie',
        slug: '/film/movie1/',
        tmdbId: '123',
        imdbId: null,
        publishedYear: null,
      });

      const scraper = new PopularScraper('https://letterboxd.com/films/popular', 1);
      await scraper.getMovies();

      // Verify fetch was called with properly formatted AJAX URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://letterboxd.com/films/ajax/popular/'
      );
    });

    it('should handle already-transformed AJAX URLs', async () => {
      const mockHtml = `
        <div class="react-component" data-target-link="/film/movie1/"></div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      });

      (getMovie as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Movie',
        slug: '/film/movie1/',
        tmdbId: '123',
        imdbId: null,
        publishedYear: null,
      });

      const scraper = new PopularScraper('https://letterboxd.com/films/ajax/popular/', 1);
      await scraper.getMovies();

      // Should use the URL as-is
      expect(global.fetch).toHaveBeenCalledWith(
        'https://letterboxd.com/films/ajax/popular/'
      );
    });

    it('should throw error for unsupported URL format', async () => {
      const scraper = new PopularScraper('https://example.com/invalid-url/', 1);

      await expect(scraper.getMovies()).rejects.toThrow('Unsupported popular movies URL format');
    });
  });

  describe('getMovies', () => {
    it('should extract movie links from HTML', async () => {
      const mockHtml = `
        <div class="react-component" data-target-link="/film/movie1/"></div>
        <div class="react-component" data-target-link="/film/movie2/"></div>
        <div class="react-component" data-target-link="/film/movie3/"></div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      });

      const mockMovie = {
        id: 1,
        name: 'Test Movie',
        slug: '/film/movie1/',
        tmdbId: '123',
        imdbId: null,
        publishedYear: null,
      };

      (getMovie as jest.Mock).mockResolvedValue(mockMovie);

      const scraper = new PopularScraper('https://letterboxd.com/films/popular', 3);
      const movies = await scraper.getMovies();

      expect(movies).toHaveLength(3);
      expect(getMovie).toHaveBeenCalledTimes(3);
      expect(getMovie).toHaveBeenCalledWith('/film/movie1/');
      expect(getMovie).toHaveBeenCalledWith('/film/movie2/');
      expect(getMovie).toHaveBeenCalledWith('/film/movie3/');
    });

    it('should respect take limit', async () => {
      const mockHtml = `
        <div class="react-component" data-target-link="/film/movie1/"></div>
        <div class="react-component" data-target-link="/film/movie2/"></div>
        <div class="react-component" data-target-link="/film/movie3/"></div>
        <div class="react-component" data-target-link="/film/movie4/"></div>
        <div class="react-component" data-target-link="/film/movie5/"></div>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      });

      const mockMovie = {
        id: 1,
        name: 'Test Movie',
        slug: '/film/movie/',
        tmdbId: '123',
        imdbId: null,
        publishedYear: null,
      };

      (getMovie as jest.Mock).mockResolvedValue(mockMovie);

      const scraper = new PopularScraper('https://letterboxd.com/films/popular', 2);
      const movies = await scraper.getMovies();

      expect(movies).toHaveLength(2);
      expect(getMovie).toHaveBeenCalledTimes(2);
    });

    it('should handle pagination', async () => {
      const mockHtml1 = `
        <div class="react-component" data-target-link="/film/movie1/"></div>
        <div class="paginate-nextprev">
          <a class="next" href="/films/ajax/popular/page/2/">Next</a>
        </div>
      `;

      const mockHtml2 = `
        <div class="react-component" data-target-link="/film/movie2/"></div>
      `;

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml1,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml2,
        });

      (getMovie as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Movie',
        slug: '/film/movie/',
        tmdbId: '123',
        imdbId: null,
        publishedYear: null,
      });

      const scraper = new PopularScraper('https://letterboxd.com/films/popular');
      const movies = await scraper.getMovies();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(movies).toHaveLength(2);
    });

    it('should throw error for fetch failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const scraper = new PopularScraper('https://letterboxd.com/films/popular');

      await expect(scraper.getMovies()).rejects.toThrow('Failed to fetch popular movies page: 404');
    });
  });
});
