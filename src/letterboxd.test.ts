// Set environment variables before importing modules
process.env.LETTERBOXD_USERNAME = 'testuser';
process.env.DATA_DIR = '/tmp/test-data';
process.env.RADARR_API_URL = 'http://localhost:7878';
process.env.RADARR_API_KEY = 'test-api-key';
process.env.RADARR_QUALITY_PROFILE = 'HD-1080p';
process.env.NODE_ENV = 'test';

// Mock axios before importing the module
const mockAxiosInstance = {
  get: jest.fn()
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockAxiosInstance)
  }
}));

import { getWatchlistMovies } from './letterboxd';

describe('letterboxd module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getWatchlistMovies', () => {
    it('should extract movie URLs and TMDB IDs from watchlist pages', async () => {
      const mockWatchlistHtml = `
        <html>
          <body>
            <div class="poster-container">
              <div class="film-poster" data-target-link="/film/test-movie-1/"></div>
            </div>
            <div class="poster-container">
              <div class="film-poster" data-target-link="/film/test-movie-2/"></div>
            </div>
          </body>
        </html>
      `;

      const mockMovieHtml1 = `
        <html>
          <body>
            <a href="https://www.themoviedb.org/movie/12345">TMDB Link</a>
          </body>
        </html>
      `;

      const mockMovieHtml2 = `
        <html>
          <body>
            <div data-tmdb-id="67890">Movie Info</div>
          </body>
        </html>
      `;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockWatchlistHtml })
        .mockResolvedValueOnce({ data: mockMovieHtml1 })
        .mockResolvedValueOnce({ data: mockMovieHtml2 });

      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(2);
      expect(movies[0]).toEqual({
        url: 'https://letterboxd.com/film/test-movie-1/',
        tmdbId: '12345'
      });
      expect(movies[1]).toEqual({
        url: 'https://letterboxd.com/film/test-movie-2/',
        tmdbId: '67890'
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('https://letterboxd.com/testuser/watchlist/page/1/');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('https://letterboxd.com/film/test-movie-1/');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('https://letterboxd.com/film/test-movie-2/');
    });

    it('should handle movies without TMDB IDs', async () => {
      const mockWatchlistHtml = `
        <div class="poster-container">
          <div class="film-poster" data-target-link="/film/test-movie/"></div>
        </div>
      `;

      const mockMovieHtml = `
        <html>
          <body>
            <p>No TMDB link here</p>
          </body>
        </html>
      `;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockWatchlistHtml })
        .mockResolvedValueOnce({ data: mockMovieHtml });

      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(1);
      expect(movies[0]).toEqual({
        url: 'https://letterboxd.com/film/test-movie/',
        tmdbId: undefined
      });
    });

    it('should handle multiple pages with next page navigation', async () => {
      const mockPage1Html = `
        <div class="poster-container">
          <div class="film-poster" data-target-link="/film/movie-1/"></div>
        </div>
        <a class="next">Next</a>
      `;

      const mockPage2Html = `
        <div class="poster-container">
          <div class="film-poster" data-target-link="/film/movie-2/"></div>
        </div>
      `;

      const mockMovieHtml = `
        <html>
          <body>
            <a href="https://www.themoviedb.org/movie/123">TMDB</a>
          </body>
        </html>
      `;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockPage1Html })
        .mockResolvedValueOnce({ data: mockPage2Html })
        .mockResolvedValueOnce({ data: mockMovieHtml })
        .mockResolvedValueOnce({ data: mockMovieHtml });

      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(2);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('https://letterboxd.com/testuser/watchlist/page/1/');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('https://letterboxd.com/testuser/watchlist/page/2/');
    });

    it('should handle network errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(0);
      expect(console.error).toHaveBeenCalledWith('Error fetching page 1:', expect.any(Error));
    });

    it('should handle empty watchlist pages', async () => {
      const emptyHtml = '<html><body></body></html>';
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: emptyHtml });

      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(0);
    });
  });

  describe('movie limiting functionality', () => {
    beforeEach(() => {
      // Reset environment for each test
      delete process.env.TAKE_AMOUNT;
      delete process.env.TAKE_STRATEGY;
      process.env.NODE_ENV = 'production';
    });

    it('should limit to 5 movies in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const mockHtml = Array.from({ length: 10 }, (_, i) => 
        `<div class="poster-container"><div class="film-poster" data-target-link="/film/movie-${i}/"></div></div>`
      ).join('');

      const mockMovieHtml = `<a href="https://www.themoviedb.org/movie/123">TMDB</a>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockHtml })
        .mockResolvedValue({ data: mockMovieHtml });

      // Reset modules to pick up new NODE_ENV
      jest.resetModules();
      const { getWatchlistMovies } = require('./letterboxd');
      
      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(5);
    });

    it('should limit to newest N movies when TAKE_STRATEGY=newest', async () => {
      process.env.TAKE_AMOUNT = '3';
      process.env.TAKE_STRATEGY = 'newest';
      
      const mockHtml = Array.from({ length: 5 }, (_, i) => 
        `<div class="poster-container"><div class="film-poster" data-target-link="/film/movie-${i}/"></div></div>`
      ).join('');

      const mockMovieHtml = `<a href="https://www.themoviedb.org/movie/123">TMDB</a>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockHtml })
        .mockResolvedValue({ data: mockMovieHtml });

      // Reset modules to pick up new env vars
      jest.resetModules();
      const { getWatchlistMovies } = require('./letterboxd');
      
      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(3);
      expect(console.log).toHaveBeenCalledWith('Limiting to newest 3 movies');
    });

    it('should limit to oldest N movies when TAKE_STRATEGY=oldest', async () => {
      process.env.TAKE_AMOUNT = '2';
      process.env.TAKE_STRATEGY = 'oldest';
      
      const mockHtml = Array.from({ length: 5 }, (_, i) => 
        `<div class="poster-container"><div class="film-poster" data-target-link="/film/movie-${i}/"></div></div>`
      ).join('');

      const mockMovieHtml = `<a href="https://www.themoviedb.org/movie/123">TMDB</a>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockHtml })
        .mockResolvedValue({ data: mockMovieHtml });

      // Reset modules to pick up new env vars
      jest.resetModules();
      const { getWatchlistMovies } = require('./letterboxd');
      
      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(2);
      expect(console.log).toHaveBeenCalledWith('Limiting to oldest 2 movies');
    });

    it('should return all movies when no limiting is configured', async () => {
      const mockHtml = Array.from({ length: 3 }, (_, i) => 
        `<div class="poster-container"><div class="film-poster" data-target-link="/film/movie-${i}/"></div></div>`
      ).join('');

      const mockMovieHtml = `<a href="https://www.themoviedb.org/movie/123">TMDB</a>`;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockHtml })
        .mockResolvedValue({ data: mockMovieHtml });

      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(3);
    });
  });

  describe('TMDB ID extraction', () => {
    it('should extract TMDB ID from themoviedb.org link', async () => {
      const mockWatchlistHtml = `
        <div class="poster-container">
          <div class="film-poster" data-target-link="/film/test-movie/"></div>
        </div>
      `;

      const mockMovieHtml = `
        <a href="https://www.themoviedb.org/movie/54321?language=en-US">TMDB Link</a>
      `;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockWatchlistHtml })
        .mockResolvedValueOnce({ data: mockMovieHtml });

      const movies = await getWatchlistMovies();

      expect(movies[0].tmdbId).toBe('54321');
    });

    it('should extract TMDB ID from data-tmdb-id attribute', async () => {
      const mockWatchlistHtml = `
        <div class="poster-container">
          <div class="film-poster" data-target-link="/film/test-movie/"></div>
        </div>
      `;

      const mockMovieHtml = `
        <div data-tmdb-id="98765">Movie Info</div>
      `;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockWatchlistHtml })
        .mockResolvedValueOnce({ data: mockMovieHtml });

      const movies = await getWatchlistMovies();

      expect(movies[0].tmdbId).toBe('98765');
    });

    it('should handle movie page fetch errors', async () => {
      const mockWatchlistHtml = `
        <div class="poster-container">
          <div class="film-poster" data-target-link="/film/test-movie/"></div>
        </div>
      `;

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockWatchlistHtml })
        .mockRejectedValueOnce(new Error('Movie page error'));

      const movies = await getWatchlistMovies();

      expect(movies).toHaveLength(1);
      expect(movies[0].tmdbId).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching TMDB ID for https://letterboxd.com/film/test-movie/:',
        expect.any(Error)
      );
    });
  });
});