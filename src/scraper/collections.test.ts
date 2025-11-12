import { CollectionsScraper } from './collections';
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

describe('CollectionsScraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('URL transformation', () => {
    it('should transform collections URL to AJAX endpoint', async () => {
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

      const scraper = new CollectionsScraper('https://letterboxd.com/films/in/the-dark-knight-collection/', 2);
      await scraper.getMovies();

      // Verify fetch was called with AJAX URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://letterboxd.com/films/ajax/in/the-dark-knight-collection/'
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

      const scraper = new CollectionsScraper('https://letterboxd.com/films/in/collection-name', 1);
      await scraper.getMovies();

      // Verify fetch was called with properly formatted AJAX URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://letterboxd.com/films/ajax/in/collection-name/'
      );
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

      const scraper = new CollectionsScraper('https://letterboxd.com/films/in/collection/', 3);
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

      const scraper = new CollectionsScraper('https://letterboxd.com/films/in/collection/', 2);
      const movies = await scraper.getMovies();

      expect(movies).toHaveLength(2);
      expect(getMovie).toHaveBeenCalledTimes(2);
    });

    it('should handle oldest strategy', async () => {
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

      const scraper = new CollectionsScraper(
        'https://letterboxd.com/films/in/collection/',
        1,
        'oldest'
      );
      await scraper.getMovies();

      // Verify fetch was called with sorting parameter
      expect(global.fetch).toHaveBeenCalledWith(
        'https://letterboxd.com/films/ajax/in/collection/by/release-earliest/'
      );
    });

    it('should handle pagination', async () => {
      const mockHtml1 = `
        <div class="react-component" data-target-link="/film/movie1/"></div>
        <div class="paginate-nextprev">
          <a class="next" href="/films/ajax/popular/in/collection/page/2/">Next</a>
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

      const scraper = new CollectionsScraper('https://letterboxd.com/films/in/collection/');
      const movies = await scraper.getMovies();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(movies).toHaveLength(2);
    });

    it('should throw error for fetch failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const scraper = new CollectionsScraper('https://letterboxd.com/films/in/invalid/');

      await expect(scraper.getMovies()).rejects.toThrow('Failed to fetch collections page: 404');
    });
  });
});
