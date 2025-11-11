import schedule from 'node-schedule';
import { main, startScheduledMonitoring } from './index';
import * as scraperModule from './scraper';
import * as radarrModule from './api/radarr';

// Mock dependencies
jest.mock('node-schedule');
jest.mock('./util/env', () => ({
  CHECK_INTERVAL_MINUTES: 10,
  LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
}));
jest.mock('./util/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('./scraper');
jest.mock('./api/radarr');

describe('main application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startScheduledMonitoring', () => {
    it('should schedule a job with correct recurrence rule', async () => {
      const mockMovies = [
        {
          id: 1,
          name: 'Test Movie',
          slug: '/film/test-movie/',
          tmdbId: '123',
          imdbId: null,
          publishedYear: null,
        },
      ];

      (scraperModule.fetchMoviesFromUrl as jest.Mock).mockResolvedValue(mockMovies);
      (radarrModule.upsertMovies as jest.Mock).mockResolvedValue(undefined);

      const mockScheduleJob = jest.fn();
      (schedule.scheduleJob as jest.Mock) = mockScheduleJob;
      (schedule.RecurrenceRule as any) = jest.fn().mockImplementation(() => ({
        minute: undefined,
      }));

      startScheduledMonitoring();

      // Verify RecurrenceRule was created
      expect(schedule.RecurrenceRule).toHaveBeenCalled();

      // Verify scheduleJob was called
      expect(mockScheduleJob).toHaveBeenCalled();

      // Verify run was called immediately
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(scraperModule.fetchMoviesFromUrl).toHaveBeenCalled();
    });

    it('should fetch movies and upsert them during run', async () => {
      const mockMovies = [
        {
          id: 1,
          name: 'Movie 1',
          slug: '/film/movie1/',
          tmdbId: '123',
          imdbId: null,
          publishedYear: null,
        },
        {
          id: 2,
          name: 'Movie 2',
          slug: '/film/movie2/',
          tmdbId: '456',
          imdbId: null,
          publishedYear: null,
        },
      ];

      (scraperModule.fetchMoviesFromUrl as jest.Mock).mockResolvedValue(mockMovies);
      (radarrModule.upsertMovies as jest.Mock).mockResolvedValue(undefined);

      // Import the run function by triggering startScheduledMonitoring
      const mockScheduleJob = jest.fn((rule, callback) => {
        // Don't execute the scheduled callback in tests
      });
      (schedule.scheduleJob as jest.Mock) = mockScheduleJob;
      (schedule.RecurrenceRule as any) = jest.fn().mockImplementation(() => ({
        minute: undefined,
      }));

      startScheduledMonitoring();

      // Wait for the immediate run to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(scraperModule.fetchMoviesFromUrl).toHaveBeenCalledWith(
        'https://letterboxd.com/user/watchlist'
      );
      expect(radarrModule.upsertMovies).toHaveBeenCalledWith(mockMovies);
    });

    it('should call fetchMoviesFromUrl and upsertMovies during scheduled run', async () => {
      const mockMovies = [
        {
          id: 1,
          name: 'Test Movie',
          slug: '/film/test-movie/',
          tmdbId: '123',
          imdbId: null,
          publishedYear: null,
        },
      ];

      (scraperModule.fetchMoviesFromUrl as jest.Mock).mockResolvedValue(mockMovies);
      (radarrModule.upsertMovies as jest.Mock).mockResolvedValue(undefined);

      let scheduledCallback: any = null;
      const mockScheduleJob = jest.fn((rule: any, callback: any) => {
        scheduledCallback = callback;
      });
      (schedule.scheduleJob as jest.Mock) = mockScheduleJob;
      (schedule.RecurrenceRule as any) = jest.fn().mockImplementation(() => ({
        minute: undefined,
      }));

      startScheduledMonitoring();

      // Wait for immediate run to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear mocks to test scheduled callback
      jest.clearAllMocks();
      (scraperModule.fetchMoviesFromUrl as jest.Mock).mockResolvedValue(mockMovies);
      (radarrModule.upsertMovies as jest.Mock).mockResolvedValue(undefined);

      // Execute the scheduled callback
      if (scheduledCallback) {
        await scheduledCallback();
      }

      // Verify the scheduled callback also calls the functions
      expect(scraperModule.fetchMoviesFromUrl).toHaveBeenCalled();
      expect(radarrModule.upsertMovies).toHaveBeenCalled();
    });
  });

  describe('main', () => {
    it('should call startScheduledMonitoring', async () => {
      const mockMovies = [
        {
          id: 1,
          name: 'Test Movie',
          slug: '/film/test-movie/',
          tmdbId: '123',
          imdbId: null,
          publishedYear: null,
        },
      ];

      (scraperModule.fetchMoviesFromUrl as jest.Mock).mockResolvedValue(mockMovies);
      (radarrModule.upsertMovies as jest.Mock).mockResolvedValue(undefined);

      const mockScheduleJob = jest.fn();
      (schedule.scheduleJob as jest.Mock) = mockScheduleJob;
      (schedule.RecurrenceRule as any) = jest.fn().mockImplementation(() => ({
        minute: undefined,
      }));

      await main();

      expect(schedule.RecurrenceRule).toHaveBeenCalled();
      expect(mockScheduleJob).toHaveBeenCalled();
    });
  });
});
