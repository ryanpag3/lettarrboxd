// Set environment variables before importing modules
process.env.LETTERBOXD_USERNAME = 'testuser';
process.env.DATA_DIR = '/tmp/test-data';
process.env.RADARR_API_URL = 'http://localhost:7878';
process.env.RADARR_API_KEY = 'test-api-key';
process.env.RADARR_QUALITY_PROFILE = 'HD-1080p';
process.env.RADARR_MINIMUM_AVAILABILITY = 'released';
process.env.CHECK_INTERVAL_MINUTES = '60';
process.env.NODE_ENV = 'test';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
};

jest.mock('fs', () => mockFs);

// Mock letterboxd module
const mockGetWatchlistMovies = jest.fn();
jest.mock('./letterboxd', () => ({
  getWatchlistMovies: mockGetWatchlistMovies
}));

// Mock radarr module
const mockLookupMovieInRadarr = jest.fn();
const mockCheckMovieInRadarr = jest.fn();
const mockAddMovie = jest.fn();

jest.mock('./radarr', () => ({
  lookupMovieInRadarr: mockLookupMovieInRadarr,
  checkMovieInRadarr: mockCheckMovieInRadarr,
  addMovie: mockAddMovie
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock('./logger', () => ({
  __esModule: true,
  default: mockLogger
}));

describe('lettarrboxd module', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processWatchlist', () => {
    it('should process watchlist successfully with new movies', async () => {
      const currentMovies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' },
        { url: 'https://letterboxd.com/film/movie2/', tmdbId: '456' }
      ];
      const previousMovies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }
      ];
      const movieDetails = { title: 'New Movie', year: 2023 };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify({ movies: previousMovies }));
      mockGetWatchlistMovies.mockResolvedValue(currentMovies);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue(movieDetails);
      mockAddMovie.mockResolvedValue({ id: 1, title: 'New Movie' });
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockGetWatchlistMovies).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Found 1 new movies out of 2 total movies');
      expect(mockCheckMovieInRadarr).toHaveBeenCalledWith('456');
      expect(mockLookupMovieInRadarr).toHaveBeenCalledWith('456');
      expect(mockAddMovie).toHaveBeenCalledWith('456', movieDetails);
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
    });

    it('should skip processing when no new movies found', async () => {
      const movies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify({ movies }));
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockLogger.debug).toHaveBeenCalledWith('No new movies found, skipping Radarr processing');
      expect(mockCheckMovieInRadarr).not.toHaveBeenCalled();
    });

    it('should handle missing movies.json file', async () => {
      const movies = [{ url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }];

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue({ title: 'Movie', year: 2023 });
      mockAddMovie.mockResolvedValue({ id: 1 });
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockLogger.debug).toHaveBeenCalledWith('No previous movies.json found, treating all movies as new');
      expect(mockLogger.debug).toHaveBeenCalledWith('Found 1 new movies out of 1 total movies');
    });

    it('should skip movies without TMDB ID', async () => {
      const movies = [{ url: 'https://letterboxd.com/film/movie1/', tmdbId: undefined }];

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockLogger.warn).toHaveBeenCalledWith('TMDB ID not found for movie');
      expect(mockCheckMovieInRadarr).not.toHaveBeenCalled();
    });

    it('should skip movies that already exist in Radarr', async () => {
      const movies = [{ url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }];
      const existingRadarrMovie = [{ id: 1, title: 'Existing Movie', tmdbId: 123 }];

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockCheckMovieInRadarr.mockResolvedValue(existingRadarrMovie);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockCheckMovieInRadarr).toHaveBeenCalledWith('123');
      expect(mockLogger.info).toHaveBeenCalledWith('Movie already exists in Radarr: Existing Movie');
      expect(mockLookupMovieInRadarr).not.toHaveBeenCalled();
    });

    it('should handle movie lookup failures gracefully', async () => {
      const movies = [{ url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }];

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue(null);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockLogger.warn).toHaveBeenCalledWith('Could not lookup movie details, skipping addition');
      expect(mockAddMovie).not.toHaveBeenCalled();
    });

    it('should handle errors during processing gracefully', async () => {
      const error = new Error('Processing failed');
      mockGetWatchlistMovies.mockRejectedValue(error);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockLogger.error).toHaveBeenCalledWith('Error during watchlist processing:', error);
    });

    it('should create directory if it does not exist when writing movies', async () => {
      const movies = [{ url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }];

      mockFs.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(false);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue({ title: 'Movie', year: 2023 });
      mockAddMovie.mockResolvedValue({ id: 1 });
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/tmp/test-data', { recursive: true });
    });

    it('should write movies with correct data structure', async () => {
      const movies = [{ url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }];

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue({ title: 'Movie', year: 2023 });
      mockAddMovie.mockResolvedValue({ id: 1 });
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockFs.promises.writeFile).toHaveBeenCalled();
      const writeCall = mockFs.promises.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);

      expect(writtenData).toMatchObject({
        totalMovies: 1,
        movies: movies
      });
      expect(writtenData.timestamp).toBeDefined();
      expect(writtenData.queryDate).toBeDefined();
    });

    it('should handle file read errors gracefully', async () => {
      const error = new Error('File read failed');
      const movies = [{ url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockRejectedValue(error);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue({ title: 'Movie', year: 2023 });
      mockAddMovie.mockResolvedValue({ id: 1 });
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockLogger.error).toHaveBeenCalledWith('Error reading previous movies:', error);
      expect(mockLogger.debug).toHaveBeenCalledWith('Found 1 new movies out of 1 total movies');
    });

    it('should handle file write errors by throwing', async () => {
      const writeError = new Error('File write failed');
      const movies = [{ url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }];

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue({ title: 'Movie', year: 2023 });
      mockAddMovie.mockResolvedValue({ id: 1 });
      mockFs.promises.writeFile.mockRejectedValue(writeError);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockLogger.error).toHaveBeenCalledWith('Error writing movies to file:', writeError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error during watchlist processing:', writeError);
    });

    it('should process multiple new movies with delays', async () => {
      const currentMovies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' },
        { url: 'https://letterboxd.com/film/movie2/', tmdbId: '456' },
        { url: 'https://letterboxd.com/film/movie3/', tmdbId: '789' }
      ];
      const previousMovies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }
      ];
      const movieDetails = { title: 'Movie', year: 2023 };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify({ movies: previousMovies }));
      mockGetWatchlistMovies.mockResolvedValue(currentMovies);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue(movieDetails);
      mockAddMovie.mockResolvedValue({ id: 1 });
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const { processWatchlist } = require('./lettarrboxd');
      await processWatchlist();

      expect(mockLogger.info).toHaveBeenCalledWith('Processing 2 new movies for Radarr...');
      expect(mockCheckMovieInRadarr).toHaveBeenCalledTimes(2);
      expect(mockCheckMovieInRadarr).toHaveBeenCalledWith('456');
      expect(mockCheckMovieInRadarr).toHaveBeenCalledWith('789');
    });
  });
});