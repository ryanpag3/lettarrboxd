import { PopularScraper } from './popular';

describe('popular scraper integration tests', () => {
  // Increase timeout for actual network requests
  jest.setTimeout(60000);

  describe('PopularScraper', () => {
    it('should fetch movies from popular movies page', async () => {
      const scraper = new PopularScraper(
        'https://letterboxd.com/films/popular/',
        5 // Only fetch first 5 to keep test fast
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(Array.isArray(movies)).toBe(true);
      expect(movies.length).toBeGreaterThan(0);
      expect(movies.length).toBeLessThanOrEqual(5);

      // Verify structure of returned movies
      movies.forEach(movie => {
        expect(movie).toHaveProperty('id');
        expect(movie).toHaveProperty('name');
        expect(movie).toHaveProperty('slug');
        expect(movie).toHaveProperty('tmdbId');
        expect(movie).toHaveProperty('imdbId');
        expect(movie).toHaveProperty('publishedYear');

        expect(typeof movie.id).toBe('number');
        expect(typeof movie.name).toBe('string');
        expect(typeof movie.slug).toBe('string');
      });
    });

    it('should respect the take limit parameter', async () => {
      const takeLimit = 3;
      const scraper = new PopularScraper(
        'https://letterboxd.com/films/popular/',
        takeLimit
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(movies.length).toBe(takeLimit);
    });

    it('should handle URLs without trailing slash', async () => {
      const scraper = new PopularScraper(
        'https://letterboxd.com/films/popular',
        3
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(Array.isArray(movies)).toBe(true);
      expect(movies.length).toBeGreaterThan(0);
    });
  });
});
