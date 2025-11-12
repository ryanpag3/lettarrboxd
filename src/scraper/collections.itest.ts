import { CollectionsScraper } from './collections';

describe('collections scraper integration tests', () => {
  // Increase timeout for actual network requests
  jest.setTimeout(60000);

  describe('CollectionsScraper', () => {
    it('should fetch movies from a collection', async () => {
      // Using The Dark Knight Collection
      const scraper = new CollectionsScraper(
        'https://letterboxd.com/films/in/the-dark-knight-collection/',
        3 // Only fetch first 3 to keep test fast
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(Array.isArray(movies)).toBe(true);
      expect(movies.length).toBeGreaterThan(0);
      expect(movies.length).toBeLessThanOrEqual(3);

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
      const takeLimit = 2;
      const scraper = new CollectionsScraper(
        'https://letterboxd.com/films/in/the-dark-knight-collection/',
        takeLimit
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(movies.length).toBe(takeLimit);
    });

    it('should handle URLs without trailing slash', async () => {
      const scraper = new CollectionsScraper(
        'https://letterboxd.com/films/in/the-dark-knight-collection',
        2
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(Array.isArray(movies)).toBe(true);
      expect(movies.length).toBeGreaterThan(0);
    });

    it('should handle oldest strategy', async () => {
      const scraper = new CollectionsScraper(
        'https://letterboxd.com/films/in/the-dark-knight-collection/',
        2,
        'oldest'
      );

      const movies = await scraper.getMovies();

      expect(movies).toBeDefined();
      expect(movies.length).toBe(2);
      // Movies should be returned (strategy affects fetch order)
      expect(movies[0]).toHaveProperty('name');
    });
  });
});
