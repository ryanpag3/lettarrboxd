import { getMovie } from './movie';
import { fetchHtml } from '../util/http-client';

// Mock the logger to avoid console output during tests
jest.mock('../util/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock the http-client module
jest.mock('../util/http-client');

describe('movie scraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMovie', () => {
    it('should extract movie data correctly from HTML', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="primaryname">The Matrix</h1>
            <div class="film-poster" data-film-id="12345">
              <img src="poster.jpg" />
            </div>
            <a data-track-action="TMDB" href="https://www.themoviedb.org/movie/603">Link</a>
            <a href="https://www.imdb.com/title/tt0133093/">IMDB Link</a>
            <span class="releasedate"><a href="/films/year/1999/">1999</a></span>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const result = await getMovie('/film/the-matrix/');

      expect(result).toEqual({
        id: 12345,
        name: 'The Matrix',
        imdbId: 'tt0133093',
        tmdbId: '603',
        publishedYear: 1999,
        slug: '/film/the-matrix/',
      });

      expect(fetchHtml).toHaveBeenCalledWith('https://letterboxd.com/film/the-matrix/');
    });

    it('should handle missing TMDB ID gracefully', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="primaryname">Some TV Show</h1>
            <div class="film-poster" data-film-id="99999">
              <img src="poster.jpg" />
            </div>
            <a href="https://www.imdb.com/title/tt1234567/">IMDB Link</a>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const result = await getMovie('/film/some-show/');

      expect(result.tmdbId).toBeNull();
      expect(result.name).toBe('Some TV Show');
    });

    it('should handle missing IMDB ID gracefully', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="primaryname">Obscure Film</h1>
            <div class="film-poster" data-film-id="88888">
              <img src="poster.jpg" />
            </div>
            <a data-track-action="TMDB" href="https://www.themoviedb.org/movie/456">TMDB Link</a>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const result = await getMovie('/film/obscure-film/');

      expect(result.imdbId).toBeNull();
      expect(result.tmdbId).toBe('456');
    });

    it('should handle missing published year gracefully', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="primaryname">Future Film</h1>
            <div class="film-poster" data-film-id="77777">
              <img src="poster.jpg" />
            </div>
            <a data-track-action="TMDB" href="https://www.themoviedb.org/movie/789">TMDB Link</a>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const result = await getMovie('/film/future-film/');

      expect(result.publishedYear).toBeNull();
    });

    it('should throw error when fetch fails', async () => {
      (fetchHtml as jest.Mock).mockRejectedValueOnce(
        new Error('HTTP request failed: 404 Not Found')
      );

      await expect(getMovie('/film/nonexistent/')).rejects.toThrow(
        'HTTP request failed: 404 Not Found'
      );
    });

    it('should throw error when Letterboxd film ID is missing', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="primaryname">Broken Film</h1>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      await expect(getMovie('/film/broken-film/')).rejects.toThrow(
        'Could not find Letterboxd film ID'
      );
    });

    it('should construct full URL from relative link', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="primaryname">Test Movie</h1>
            <div class="film-poster" data-film-id="11111">
              <img src="poster.jpg" />
            </div>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      await getMovie('/film/test-movie/');

      expect(fetchHtml).toHaveBeenCalledWith('https://letterboxd.com/film/test-movie/');
    });

    it('should handle TMDB TV show link (no movie ID)', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="primaryname">TV Show</h1>
            <div class="film-poster" data-film-id="22222">
              <img src="poster.jpg" />
            </div>
            <a data-track-action="TMDB" href="https://www.themoviedb.org/tv/12345">TMDB TV Link</a>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const result = await getMovie('/film/tv-show/');

      expect(result.tmdbId).toBeNull();
    });

    it('should handle malformed IMDB link', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="primaryname">Movie</h1>
            <div class="film-poster" data-film-id="33333">
              <img src="poster.jpg" />
            </div>
            <a href="https://www.imdb.com/name/nm0000123/">IMDB Person Link</a>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const result = await getMovie('/film/movie/');

      expect(result.imdbId).toBeNull();
    });

    it('should handle malformed release date link', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1 class="primaryname">Movie</h1>
            <div class="film-poster" data-film-id="44444">
              <img src="poster.jpg" />
            </div>
            <span class="releasedate"><a href="/films/decade/2020s/">2020s</a></span>
          </body>
        </html>
      `;

      (fetchHtml as jest.Mock).mockResolvedValueOnce({
        html: mockHtml,
        statusCode: 200,
      });

      const result = await getMovie('/film/movie/');

      expect(result.publishedYear).toBeNull();
    });
  });
});
