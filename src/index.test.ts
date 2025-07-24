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

// Mock lettarrboxd module
const mockProcessWatchlist = jest.fn();
jest.mock('./lettarrboxd', () => ({
  processWatchlist: mockProcessWatchlist
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



  describe('scheduling and monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start scheduled monitoring with correct interval', async () => {
      mockProcessWatchlist.mockResolvedValue(undefined);

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

      expect(mockLogger.info).toHaveBeenCalledWith('Lettarrboxd starting...');
    });

  });

});