// Set environment variables before any imports
process.env.RADARR_API_URL = 'http://localhost:3000';
process.env.RADARR_API_KEY = 'test-api-key';
process.env.RADARR_QUALITY_PROFILE = 'HD-1080p';
process.env.RADARR_MINIMUM_AVAILABILITY = 'released';
process.env.LETTERBOXD_USERNAME = 'testuser';
process.env.DATA_DIR = '/tmp/test-data';

import * as fs from 'fs';
import * as path from 'path';
import { createMockRadarrServer, MockRadarrServer } from './mock-radarr-server';

describe('Integration Tests', () => {
  let mockServer: MockRadarrServer;
  let originalEnv: NodeJS.ProcessEnv;
  let radarrModule: any;

  beforeAll(async () => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Start mock Radarr server
    mockServer = await createMockRadarrServer();
    
    // Update API URL with actual server port
    process.env.RADARR_API_URL = `http://localhost:${mockServer.port}`;

    // Reset modules to pick up new environment
    jest.resetModules();

    // Dynamically import radarr module after environment is set
    radarrModule = await import('../radarr');

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterAll(async () => {
    // Restore environment
    process.env = originalEnv;
    
    // Close mock server
    await mockServer.close();
    
    // Restore console
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    // Reset mock server state between tests
    await mockServer.close();
    mockServer = await createMockRadarrServer();
    process.env.RADARR_API_URL = `http://localhost:${mockServer.port}`;
    
    // Clear modules to get fresh instances with new env vars
    jest.resetModules();
    radarrModule = await import('../radarr');
  });

  describe('Radarr API Integration', () => {
    it('should lookup movie by TMDB ID', async () => {
      const movieData = await radarrModule.lookupMovieInRadarr('12345');
      
      expect(movieData).toBeDefined();
      expect(movieData.title).toBe('Test Movie');
      expect(movieData.year).toBe(2023);
      expect(movieData.tmdbId).toBe(12345);
    });

    it('should return null for non-existent movie', async () => {
      const movieData = await radarrModule.lookupMovieInRadarr('99999');
      
      expect(movieData).toBeNull();
    });

    it('should check if movie exists in library', async () => {
      // First check should return empty array (movie not in library)
      const initialCheck = await radarrModule.checkMovieInRadarr('12345');
      expect(initialCheck).toEqual([]);
      
      // Add movie to library
      const movieData = await radarrModule.lookupMovieInRadarr('12345');
      await radarrModule.addMovie('12345', movieData);
      
      // Now check should return the movie
      const secondCheck = await radarrModule.checkMovieInRadarr('12345');
      expect(secondCheck).toHaveLength(1);
      expect(secondCheck[0].tmdbId).toBe(12345);
    });

    it('should get quality profile ID by name', async () => {
      const profileId = await radarrModule.getQualityProfileId('HD-1080p');
      
      expect(profileId).toBe(2);
    });

    it('should return null for non-existent quality profile', async () => {
      const profileId = await radarrModule.getQualityProfileId('NonExistent');
      
      expect(profileId).toBeNull();
    });

    it('should get root folder path', async () => {
      const rootFolder = await radarrModule.getRootFolder();
      
      expect(rootFolder).toBe('/movies');
    });

    it('should get root folder by ID', async () => {
      const rootFolderPath = await radarrModule.getRootFolderById('1');
      
      expect(rootFolderPath).toBe('/movies');
    });

    it('should return null for non-existent root folder ID', async () => {
      const rootFolderPath = await radarrModule.getRootFolderById('999');
      
      expect(rootFolderPath).toBeNull();
    });

    it('should get or create tag', async () => {
      // Get existing tag
      const existingTagId = await radarrModule.getOrCreateTag('existing-tag');
      expect(existingTagId).toBe(1);
      
      // Create new tag
      const newTagId = await radarrModule.getOrCreateTag('letterboxd-watchlist');
      expect(newTagId).toBe(2);
      
      // Get the newly created tag
      const sameTagId = await radarrModule.getOrCreateTag('letterboxd-watchlist');
      expect(sameTagId).toBe(2);
    });

    it('should add movie to Radarr with all metadata', async () => {
      const movieData = await radarrModule.lookupMovieInRadarr('67890');
      expect(movieData).toBeDefined();
      
      const addedMovie = await radarrModule.addMovie('67890', movieData);
      
      expect(addedMovie).toBeDefined();
      expect(addedMovie.title).toBe('Another Test Movie');
      expect(addedMovie.tmdbId).toBe(67890);
      expect(addedMovie.qualityProfileId).toBe(2);
      expect(addedMovie.rootFolderPath).toBe('/movies');
      expect(addedMovie.monitored).toBe(true);
      expect(addedMovie.tags).toContain(2); // letterboxd-watchlist tag
    });

    it('should use specific root folder when RADARR_ROOT_FOLDER_ID is set', async () => {
      // Temporarily set the environment variable
      const originalRootFolderId = process.env.RADARR_ROOT_FOLDER_ID;
      process.env.RADARR_ROOT_FOLDER_ID = '2';
      
      // Reset modules to pick up new environment
      jest.resetModules();
      const radarrModuleWithRootId = await import('../radarr');
      
      const movieData = await radarrModuleWithRootId.lookupMovieInRadarr('12345');
      expect(movieData).toBeDefined();
      
      const addedMovie = await radarrModuleWithRootId.addMovie('12345', movieData);
      
      expect(addedMovie).toBeDefined();
      expect(addedMovie.rootFolderPath).toBe('/movies-4k');
      
      // Restore original environment
      if (originalRootFolderId) {
        process.env.RADARR_ROOT_FOLDER_ID = originalRootFolderId;
      } else {
        delete process.env.RADARR_ROOT_FOLDER_ID;
      }
    });
  });

  describe('End-to-End Movie Processing', () => {
    it('should process a complete movie workflow', async () => {
      const tmdbId = '12345';
      
      // 1. Check if movie exists (should not exist initially)
      const initialCheck = await radarrModule.checkMovieInRadarr(tmdbId);
      expect(initialCheck).toEqual([]);
      
      // 2. Lookup movie details
      const movieDetails = await radarrModule.lookupMovieInRadarr(tmdbId);
      expect(movieDetails).toBeDefined();
      expect(movieDetails.title).toBe('Test Movie');
      
      // 3. Add movie to Radarr
      const addedMovie = await radarrModule.addMovie(tmdbId, movieDetails);
      expect(addedMovie).toBeDefined();
      expect(addedMovie.tmdbId).toBe(12345);
      
      // 4. Verify movie now exists in library
      const finalCheck = await radarrModule.checkMovieInRadarr(tmdbId);
      expect(finalCheck).toHaveLength(1);
      expect(finalCheck[0].title).toBe('Test Movie');
    });

    it('should handle duplicate movie addition gracefully', async () => {
      const tmdbId = '12345';
      
      // Add movie first time
      const movieDetails = await radarrModule.lookupMovieInRadarr(tmdbId);
      const firstAdd = await radarrModule.addMovie(tmdbId, movieDetails);
      expect(firstAdd).toBeDefined();
      
      // Try to add same movie again (should handle gracefully)
      const secondAdd = await radarrModule.addMovie(tmdbId, movieDetails);
      expect(secondAdd).toBeDefined();
      
      // Should still only have one movie in library
      const movies = await radarrModule.checkMovieInRadarr(tmdbId);
      expect(movies.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Test with server temporarily unavailable
      await mockServer.close();
      
      const result = await radarrModule.lookupMovieInRadarr('12345');
      expect(result).toBeNull();
      
      // Restart server for other tests
      mockServer = await createMockRadarrServer();
      process.env.RADARR_API_URL = `http://localhost:${mockServer.port}`;
    });

    it('should handle missing movie data', async () => {
      const result = await radarrModule.addMovie('99999', null);
      expect(result).toBeNull();
    });
  });
});