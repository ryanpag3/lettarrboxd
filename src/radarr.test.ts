// Set environment variables before importing modules
process.env.LETTERBOXD_USERNAME = 'testuser';
process.env.DATA_DIR = '/tmp/test-data';
process.env.RADARR_API_URL = 'http://localhost:7878';
process.env.RADARR_API_KEY = 'test-api-key';
process.env.RADARR_QUALITY_PROFILE = 'HD-1080p';
process.env.RADARR_MINIMUM_AVAILABILITY = 'released';
process.env.NODE_ENV = 'test';

// Mock axios before importing the module
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn()
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockAxiosInstance)
  }
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

import { 
  lookupMovieInRadarr, 
  checkMovieInRadarr, 
  getQualityProfileId, 
  getRootFolder, 
  getOrCreateTag, 
  addMovie 
} from './radarr';

describe('radarr module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('lookupMovieInRadarr', () => {
    it('should lookup movie by TMDB ID and return movie data', async () => {
      const mockMovieData = { 
        title: 'Test Movie', 
        year: 2023, 
        tmdbId: 12345,
        runtime: 120,
        overview: 'A test movie'
      };
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockMovieData });

      const result = await lookupMovieInRadarr('12345');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v3/movie/lookup/tmdb', {
        params: { tmdbId: '12345' }
      });
      expect(result).toEqual(mockMovieData);
      expect(mockLogger.debug).toHaveBeenCalledWith('Looking up TMDB ID 12345 in Radarr...');
    });

    it('should handle API errors and return null', async () => {
      const error = new Error('API Error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const result = await lookupMovieInRadarr('12345');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Error looking up TMDB ID 12345 in Radarr:', error);
    });

    it('should log the API response', async () => {
      const mockData = { title: 'Test Movie' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

      await lookupMovieInRadarr('67890');

      expect(mockLogger.debug).toHaveBeenCalledWith('Radarr response for TMDB ID 67890:', mockData);
    });
  });

  describe('checkMovieInRadarr', () => {
    it('should check if movie exists in library', async () => {
      const mockLibraryData = [{ id: 1, title: 'Existing Movie', tmdbId: 12345 }];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockLibraryData });

      const result = await checkMovieInRadarr('12345');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v3/movie', {
        params: { tmdbId: '12345' }
      });
      expect(result).toEqual(mockLibraryData);
      expect(mockLogger.debug).toHaveBeenCalledWith('Checking if TMDB ID 12345 exists in Radarr...');
    });

    it('should return empty array for non-existent movie', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });

      const result = await checkMovieInRadarr('99999');

      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Library check failed');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const result = await checkMovieInRadarr('12345');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Error checking TMDB ID 12345 in Radarr library:', error);
    });
  });

  describe('getQualityProfileId', () => {
    it('should return quality profile ID when profile exists', async () => {
      const mockProfiles = [
        { id: 1, name: 'SD' },
        { id: 2, name: 'HD-1080p' },
        { id: 3, name: '4K' }
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProfiles });

      const result = await getQualityProfileId('HD-1080p');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v3/qualityprofile');
      expect(result).toBe(2);
      expect(mockLogger.debug).toHaveBeenCalledWith('Getting quality profile ID for: HD-1080p');
      expect(mockLogger.debug).toHaveBeenCalledWith('Found quality profile: HD-1080p (ID: 2)');
    });

    it('should return null when profile does not exist', async () => {
      const mockProfiles = [{ id: 1, name: 'SD' }];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProfiles });

      const result = await getQualityProfileId('NonExistent');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Quality profile not found: NonExistent');
      expect(mockLogger.debug).toHaveBeenCalledWith('Available profiles:', ['SD']);
    });

    it('should handle API errors', async () => {
      const error = new Error('Profiles API error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const result = await getQualityProfileId('HD-1080p');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting quality profiles:', error);
    });
  });

  describe('getRootFolder', () => {
    it('should return first available root folder path', async () => {
      const mockRootFolders = [
        { id: 1, path: '/movies' },
        { id: 2, path: '/movies-4k' }
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockRootFolders });

      const result = await getRootFolder();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v3/rootfolder');
      expect(result).toBe('/movies');
      expect(mockLogger.debug).toHaveBeenCalledWith('Using root folder: /movies');
    });

    it('should return null when no root folders exist', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });

      const result = await getRootFolder();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('No root folders found in Radarr');
    });

    it('should handle API errors', async () => {
      const error = new Error('Root folder API error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const result = await getRootFolder();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting root folders:', error);
    });
  });

  describe('getOrCreateTag', () => {
    it('should return existing tag ID when tag exists', async () => {
      const mockTags = [
        { id: 1, label: 'existing-tag' },
        { id: 2, label: 'letterboxd-watchlist' }
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTags });

      const result = await getOrCreateTag('letterboxd-watchlist');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v3/tag');
      expect(result).toBe(2);
      expect(mockLogger.debug).toHaveBeenCalledWith('Getting or creating tag: letterboxd-watchlist');
      expect(mockLogger.debug).toHaveBeenCalledWith('Tag already exists: letterboxd-watchlist (ID: 2)');
    });

    it('should create new tag when tag does not exist', async () => {
      const mockExistingTags = [{ id: 1, label: 'existing-tag' }];
      const mockNewTag = { id: 3, label: 'new-tag' };
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockExistingTags });
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockNewTag });

      const result = await getOrCreateTag('new-tag');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v3/tag', {
        label: 'new-tag'
      });
      expect(result).toBe(3);
      expect(mockLogger.debug).toHaveBeenCalledWith('Creating new tag: new-tag');
      expect(mockLogger.info).toHaveBeenCalledWith('Created tag: new-tag (ID: 3)');
    });

    it('should handle API errors', async () => {
      const error = new Error('Tag API error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      const result = await getOrCreateTag('test-tag');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting or creating tag test-tag:', error);
    });
  });

  describe('addMovie', () => {
    it('should successfully add movie with all required metadata', async () => {
      const movieData = { title: 'Test Movie', year: 2023 };
      const mockProfiles = [{ id: 2, name: 'HD-1080p' }];
      const mockRootFolders = [{ id: 1, path: '/movies' }];
      const mockTags = [{ id: 1, label: 'letterboxd-watchlist' }];
      const mockAddedMovie = { 
        id: 123, 
        title: 'Test Movie', 
        tmdbId: 12345,
        qualityProfileId: 2,
        rootFolderPath: '/movies',
        tags: [1]
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockProfiles })
        .mockResolvedValueOnce({ data: mockRootFolders })
        .mockResolvedValueOnce({ data: mockTags });
      
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockAddedMovie });

      const result = await addMovie('12345', movieData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v3/movie', {
        title: 'Test Movie',
        qualityProfileId: 2,
        rootFolderPath: '/movies',
        tmdbId: 12345,
        minimumAvailability: 'released',
        monitored: true,
        tags: [1],
        addOptions: {
          searchForMovie: true
        }
      });
      expect(result).toEqual(mockAddedMovie);
      expect(mockLogger.debug).toHaveBeenCalledWith('Adding movie to Radarr: Test Movie (TMDB: 12345)');
    });

    it('should return null when movie data is null', async () => {
      const result = await addMovie('12345', null);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('No movie data provided for TMDB ID: 12345');
    });

    it('should handle missing quality profile', async () => {
      const movieData = { title: 'Test Movie' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });

      const result = await addMovie('12345', movieData);

      expect(result).toBeNull();
    });

    it('should handle missing root folder', async () => {
      const movieData = { title: 'Test Movie' };
      const mockProfiles = [{ id: 2, name: 'HD-1080p' }];
      
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockProfiles })
        .mockResolvedValueOnce({ data: [] });

      const result = await addMovie('12345', movieData);

      expect(result).toBeNull();
    });

    it('should add movie without tags if tag creation fails', async () => {
      const movieData = { title: 'Test Movie' };
      const mockProfiles = [{ id: 2, name: 'HD-1080p' }];
      const mockRootFolders = [{ id: 1, path: '/movies' }];
      const mockAddedMovie = { id: 123, title: 'Test Movie' };

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockProfiles })
        .mockResolvedValueOnce({ data: mockRootFolders })
        .mockRejectedValueOnce(new Error('Tag API Error'));
      
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockAddedMovie });

      const result = await addMovie('12345', movieData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v3/movie', 
        expect.objectContaining({
          tags: []
        })
      );
      expect(result).toEqual(mockAddedMovie);
    });

    it('should handle movie addition API errors', async () => {
      const movieData = { title: 'Test Movie' };
      const mockProfiles = [{ id: 2, name: 'HD-1080p' }];
      const mockRootFolders = [{ id: 1, path: '/movies' }];
      const mockTags = [{ id: 1, label: 'letterboxd-watchlist' }];

      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockProfiles })
        .mockResolvedValueOnce({ data: mockRootFolders })
        .mockResolvedValueOnce({ data: mockTags });
      
      const error = new Error('Add Movie Error');
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      const result = await addMovie('12345', movieData);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Error adding movie Test Movie (TMDB: 12345):', error);
    });
  });
});