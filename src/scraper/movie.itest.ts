import { getMovie } from './movie';

describe('movie scraper integration tests', () => {
  // Increase timeout for actual network requests
  jest.setTimeout(30000);

  describe('getMovie', () => {
    it('should fetch and parse a real movie from Letterboxd', async () => {
      // Using The Matrix as a stable test case
      const result = await getMovie('/film/the-matrix/');

      expect(result).toBeDefined();
      expect(result.name).toBe('The Matrix');
      expect(result.id).toBeDefined();
      expect(result.slug).toBe('/film/the-matrix/');
      expect(result.tmdbId).toBeTruthy();
      expect(result.imdbId).toBeTruthy();
      expect(result.publishedYear).toBe(1999);
    });

    it('should handle a movie with missing IMDB data', async () => {
      // Using a classic film that might have different metadata
      const result = await getMovie('/film/nosferatu/');

      expect(result).toBeDefined();
      expect(result.name).toBe('Nosferatu');
      expect(result.id).toBeDefined();
      expect(result.slug).toBe('/film/nosferatu/');
      // These fields should still exist even if null
      expect(result).toHaveProperty('tmdbId');
      expect(result).toHaveProperty('imdbId');
      expect(result).toHaveProperty('publishedYear');
    });

    it('should throw error for non-existent movie', async () => {
      await expect(
        getMovie('/film/this-movie-definitely-does-not-exist-12345/')
      ).rejects.toThrow();
    });
  });
});
