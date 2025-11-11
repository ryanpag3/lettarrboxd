import { detectListType, fetchMoviesFromUrl, ListType } from './index';

describe('scraper index integration tests', () => {
  // Increase timeout for actual network requests
  jest.setTimeout(60000);

  describe('detectListType', () => {
    it('should correctly detect various URL types', () => {
      expect(detectListType('https://letterboxd.com/user/watchlist')).toBe(ListType.WATCHLIST);
      expect(detectListType('https://letterboxd.com/user/list/favorites')).toBe(ListType.REGULAR_LIST);
      expect(detectListType('https://letterboxd.com/user/films')).toBe(ListType.WATCHED_MOVIES);
      expect(detectListType('https://letterboxd.com/actor/tom-hanks')).toBe(ListType.ACTOR_FILMOGRAPHY);
      expect(detectListType('https://letterboxd.com/director/christopher-nolan')).toBe(ListType.DIRECTOR_FILMOGRAPHY);
      expect(detectListType('https://letterboxd.com/writer/aaron-sorkin')).toBe(ListType.WRITER_FILMOGRAPHY);
      expect(detectListType('https://letterboxd.com/films/in/marvel-cinematic-universe')).toBe(ListType.COLLECTIONS);
      expect(detectListType('https://letterboxd.com/films/popular')).toBe(ListType.POPULAR_MOVIES);
    });
  });

  describe('fetchMoviesFromUrl', () => {
    it('should fetch movies from a regular list URL', async () => {
      // Using Letterboxd's official Top 250 list
      const movies = await fetchMoviesFromUrl(
        'https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/'
      );

      expect(movies).toBeDefined();
      expect(Array.isArray(movies)).toBe(true);
      expect(movies.length).toBeGreaterThan(0);

      // Verify first movie has proper structure
      const firstMovie = movies[0];
      expect(firstMovie).toHaveProperty('id');
      expect(firstMovie).toHaveProperty('name');
      expect(firstMovie).toHaveProperty('slug');
      expect(firstMovie).toHaveProperty('tmdbId');
    });

    it('should throw error for unsupported URL format', async () => {
      await expect(
        fetchMoviesFromUrl('https://example.com/not-letterboxd')
      ).rejects.toThrow('Unsupported URL format');
    });

    it('should throw error for unimplemented list types', async () => {
      // Watched movies is not implemented
      await expect(
        fetchMoviesFromUrl('https://letterboxd.com/someuser/films')
      ).rejects.toThrow('Watched movies scraping not implemented');
    });

    it('should throw error for actor filmography (not implemented)', async () => {
      await expect(
        fetchMoviesFromUrl('https://letterboxd.com/actor/tom-hanks')
      ).rejects.toThrow('Actor filmography scraping not implemented');
    });

    it('should throw error for director filmography (not implemented)', async () => {
      await expect(
        fetchMoviesFromUrl('https://letterboxd.com/director/christopher-nolan')
      ).rejects.toThrow('Director filmography scraping not implemented');
    });

    it('should throw error for collections (not implemented)', async () => {
      await expect(
        fetchMoviesFromUrl('https://letterboxd.com/films/in/marvel-cinematic-universe')
      ).rejects.toThrow('Collections scraping not implemented');
    });
  });
});
