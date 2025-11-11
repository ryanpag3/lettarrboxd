import { ListScraper } from './list';

describe('list scraper integration tests', () => {
  // Increase timeout for actual network requests
  jest.setTimeout(60000);

  describe('ListScraper', () => {
    it('should fetch movies from a public Letterboxd list', async () => {
      // Using a well-known public list with stable content
      // Letterboxd's official "Top 250 Narrative Features" list
      const scraper = new ListScraper(
        'https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/',
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
      const scraper = new ListScraper(
        'https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/',
        takeLimit
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(movies.length).toBe(takeLimit);
    });

    it('should handle oldest strategy', async () => {
      const scraper = new ListScraper(
        'https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/',
        2,
        'oldest'
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(movies.length).toBe(2);
      // Movies should be returned (strategy affects fetch order)
      expect(movies[0]).toHaveProperty('name');
    });

    it('should handle empty list gracefully', async () => {
      // Create a scraper for a potentially empty or very small list
      const scraper = new ListScraper(
        'https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/',
        0 // Take 0 movies
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(Array.isArray(movies)).toBe(true);
      expect(movies.length).toBe(0);
    });
  });
});
