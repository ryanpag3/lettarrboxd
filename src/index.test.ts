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

// Don't mock setInterval for these tests as we need to test the actual function calls

// Import the module functions without executing main
jest.doMock('./index', () => {
  const originalModule = jest.requireActual('./index');
  
  // Replace the main execution with a no-op
  const mockMain = jest.fn();
  
  return {
    ...originalModule,
    main: mockMain
  };
});

describe('index module', () => {
  let indexModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  describe('file operations', () => {
    it('should read previous movies from JSON file', async () => {
      const mockMoviesData = {
        timestamp: '2023-01-01T00:00:00.000Z',
        queryDate: '1/1/2023',
        totalMovies: 2,
        movies: [
          { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' },
          { url: 'https://letterboxd.com/film/movie2/', tmdbId: '456' }
        ]
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockMoviesData));

      // Import the actual functions
      jest.resetModules();
      const { processWatchlist } = require('./index');

      // Setup mocks for watchlist processing
      mockGetWatchlistMovies.mockResolvedValue([]);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      await processWatchlist();

      expect(mockFs.promises.readFile).toHaveBeenCalledWith('/tmp/test-data/movies.json', 'utf8');
    });

    it('should handle missing movies.json file', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue([]);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      jest.resetModules();
      const { processWatchlist } = require('./index');

      await processWatchlist();

      expect(mockLogger.info).toHaveBeenCalledWith('No previous movies.json found, treating all movies as new');
    });

    it('should write movies to JSON file with correct structure', async () => {
      const movies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }
      ];

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      jest.resetModules();
      const { processWatchlist } = require('./index');

      await processWatchlist();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/tmp/test-data', { recursive: true });
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        '/tmp/test-data/movies.json',
        expect.stringContaining('"totalMovies": 1'),
        'utf8'
      );
    });
  });

  describe('movie processing logic', () => {
    it('should identify new movies by comparing URLs', async () => {
      const currentMovies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' },
        { url: 'https://letterboxd.com/film/movie2/', tmdbId: '456' },
        { url: 'https://letterboxd.com/film/movie3/', tmdbId: '789' }
      ];

      const previousMovies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' },
        { url: 'https://letterboxd.com/film/movie2/', tmdbId: '456' }
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify({
        movies: previousMovies
      }));
      mockGetWatchlistMovies.mockResolvedValue(currentMovies);
      mockFs.promises.writeFile.mockResolvedValue(undefined);
      mockCheckMovieInRadarr.mockResolvedValue([]);

      jest.resetModules();
      const { processWatchlist } = require('./index');

      await processWatchlist();

      expect(mockLogger.info).toHaveBeenCalledWith('Found 1 new movies out of 3 total movies');
    });

    it('should skip processing when no new movies found', async () => {
      const movies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify({ movies }));
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      jest.resetModules();
      const { processWatchlist } = require('./index');

      await processWatchlist();

      expect(mockLogger.info).toHaveBeenCalledWith('No new movies found, skipping Radarr processing');
    });

    it('should process new movies and add them to Radarr', async () => {
      const previousMovies = [
        { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }
      ];
      const currentMovies = [
        ...previousMovies,
        { url: 'https://letterboxd.com/film/movie2/', tmdbId: '456' }
      ];

      const movieDetails = { title: 'New Movie', year: 2023 };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify({ movies: previousMovies }));
      mockGetWatchlistMovies.mockResolvedValue(currentMovies);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue(movieDetails);
      mockAddMovie.mockResolvedValue({ id: 1, title: 'New Movie' });
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      jest.resetModules();
      const { processWatchlist } = require('./index');

      await processWatchlist();

      expect(mockCheckMovieInRadarr).toHaveBeenCalledWith('456');
      expect(mockLookupMovieInRadarr).toHaveBeenCalledWith('456');
      expect(mockAddMovie).toHaveBeenCalledWith('456', movieDetails);
    });

    it('should skip movies that already exist in Radarr', async () => {
      const newMovie = { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' };
      const existingRadarrMovie = { id: 1, title: 'Existing Movie', tmdbId: 123 };

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue([newMovie]);
      mockCheckMovieInRadarr.mockResolvedValue([existingRadarrMovie]);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      jest.resetModules();
      const { processWatchlist } = require('./index');

      await processWatchlist();

      expect(mockCheckMovieInRadarr).toHaveBeenCalledWith('123');
      expect(mockLogger.info).toHaveBeenCalledWith('Movie already exists in Radarr: Existing Movie');
    });

    it('should skip movies without TMDB ID', async () => {
      const movieWithoutTmdb = { url: 'https://letterboxd.com/film/movie1/', tmdbId: undefined };

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue([movieWithoutTmdb]);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      jest.resetModules();
      const { processWatchlist } = require('./index');

      await processWatchlist();

      expect(mockLogger.warn).toHaveBeenCalledWith('TMDB ID not found for movie');
    });

    it('should handle movie lookup failures gracefully', async () => {
      const newMovie = { url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' };

      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue([newMovie]);
      mockCheckMovieInRadarr.mockResolvedValue([]);
      mockLookupMovieInRadarr.mockResolvedValue(null);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      jest.resetModules();
      const { processWatchlist } = require('./index');

      await processWatchlist();

      expect(mockLogger.warn).toHaveBeenCalledWith('Could not lookup movie details, skipping addition');
    });
  });

  describe('scheduling and monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start scheduled monitoring with correct interval', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue([]);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      jest.resetModules();
      const { startScheduledMonitoring } = require('./index');

      startScheduledMonitoring();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting scheduled monitoring every 60 minutes');
      // Check that setInterval was called (we can't easily mock this without affecting the actual function)
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Next check will be at:'));
    });

    it('should log application startup information', async () => {
      // Mock the startScheduledMonitoring function to prevent side effects
      const mockStartScheduledMonitoring = jest.fn();
      
      jest.resetModules();
      jest.doMock('./index', () => ({
        ...jest.requireActual('./index'),
        startScheduledMonitoring: mockStartScheduledMonitoring
      }));
      
      const { main } = require('./index');
      await main();

      expect(mockLogger.info).toHaveBeenCalledWith('Watchlistarr starting...');
      expect(mockLogger.info).toHaveBeenCalledWith('Environment configuration:');
      expect(mockLogger.info).toHaveBeenCalledWith('- Check interval: 60 minutes');
      expect(mockLogger.info).toHaveBeenCalledWith('- Environment: test');
      expect(mockLogger.info).toHaveBeenCalledWith('- Letterboxd user: testuser');
    });

    it('should handle processing errors gracefully', async () => {
      const error = new Error('Processing failed');
      mockGetWatchlistMovies.mockRejectedValue(error);

      jest.resetModules();
      const { processWatchlist } = require('./index');

      await processWatchlist();

      expect(mockLogger.error).toHaveBeenCalledWith('Error during watchlist processing:', error);
    });
  });

  describe('data structures and formatting', () => {
    it('should create proper movies data structure', async () => {
      const movies = [{ url: 'https://letterboxd.com/film/movie1/', tmdbId: '123' }];
      
      mockFs.existsSync.mockReturnValue(false);
      mockGetWatchlistMovies.mockResolvedValue(movies);
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      jest.resetModules();
      const { processWatchlist } = require('./index');

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

    it('should handle interval calculation correctly', async () => {
      // Test that the function exists and can be called without errors
      jest.resetModules();
      const { startScheduledMonitoring } = require('./index');

      expect(() => startScheduledMonitoring()).not.toThrow();
    });
  });
});