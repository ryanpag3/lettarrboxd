import { z } from 'zod';

// Mock process.env before importing env module
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('env validation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockProcessExit.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('successful validation', () => {
    it('should validate all required environment variables with defaults', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p'
      };

      const env = require('./env').default;
      
      expect(env.LETTERBOXD_USERNAME).toBe('testuser');
      expect(env.DATA_DIR).toBe('/data');
      expect(env.RADARR_API_URL).toBe('http://localhost:7878');
      expect(env.RADARR_API_KEY).toBe('test-key');
      expect(env.RADARR_QUALITY_PROFILE).toBe('HD-1080p');
      
      // Test defaults
      expect(env.NODE_ENV).toBe('test');
      expect(env.LOG_LEVEL).toBe('info');
      expect(env.RADARR_MINIMUM_AVAILABILITY).toBe('released');
      expect(env.CHECK_INTERVAL_MINUTES).toBe(10);
    });

    it('should override defaults when explicitly provided', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        NODE_ENV: 'production',
        LOG_LEVEL: 'debug',
        RADARR_MINIMUM_AVAILABILITY: 'announced',
        CHECK_INTERVAL_MINUTES: '30'
      };

      const env = require('./env').default;
      
      expect(env.NODE_ENV).toBe('production');
      expect(env.LOG_LEVEL).toBe('debug');
      expect(env.RADARR_MINIMUM_AVAILABILITY).toBe('announced');
      expect(env.CHECK_INTERVAL_MINUTES).toBe(30);
    });

    it('should validate LETTERBOXD_LETTERBOXD_TAKE_AMOUNT and LETTERBOXD_LETTERBOXD_TAKE_STRATEGY when both provided', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        LETTERBOXD_LETTERBOXD_TAKE_AMOUNT: '10',
        LETTERBOXD_LETTERBOXD_TAKE_STRATEGY: 'newest'
      };

      const env = require('./env').default;
      
      expect(env.LETTERBOXD_LETTERBOXD_TAKE_AMOUNT).toBe(10);
      expect(env.LETTERBOXD_LETTERBOXD_TAKE_STRATEGY).toBe('newest');
    });

    it('should handle oldest strategy', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        LETTERBOXD_TAKE_AMOUNT: '5',
        LETTERBOXD_TAKE_STRATEGY: 'oldest'
      };

      const env = require('./env').default;
      
      expect(env.LETTERBOXD_TAKE_AMOUNT).toBe(5);
      expect(env.LETTERBOXD_TAKE_STRATEGY).toBe('oldest');
    });

    it('should allow missing LETTERBOXD_TAKE_AMOUNT and LETTERBOXD_TAKE_STRATEGY when both omitted', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p'
      };

      const env = require('./env').default;
      
      expect(env.LETTERBOXD_TAKE_AMOUNT).toBeUndefined();
      expect(env.LETTERBOXD_TAKE_STRATEGY).toBeUndefined();
    });
  });

  describe('validation failures', () => {
    it('should fail when LETTERBOXD_USERNAME is missing', () => {
      process.env = {
        ...originalEnv,
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p'
      };
      delete process.env.LETTERBOXD_USERNAME;

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith('Environment validation failed:');
    });

    it('should fail when DATA_DIR is missing', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p'
      };
      delete process.env.DATA_DIR;

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should fail when RADARR_API_URL is missing', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p'
      };
      delete process.env.RADARR_API_URL;

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should fail when RADARR_API_KEY is missing', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_QUALITY_PROFILE: 'HD-1080p'
      };
      delete process.env.RADARR_API_KEY;

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should fail when RADARR_QUALITY_PROFILE is missing', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key'
      };
      delete process.env.RADARR_QUALITY_PROFILE;

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should fail when NODE_ENV has invalid value', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        NODE_ENV: 'invalid'
      };

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should fail when LOG_LEVEL has invalid value', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        LOG_LEVEL: 'invalid'
      };

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should enforce minimum CHECK_INTERVAL_MINUTES of 10', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        CHECK_INTERVAL_MINUTES: '5'
      };

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should fail when LETTERBOXD_TAKE_AMOUNT is not a positive number', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        LETTERBOXD_TAKE_AMOUNT: '0',
        LETTERBOXD_TAKE_STRATEGY: 'newest'
      };

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should fail when LETTERBOXD_TAKE_STRATEGY is invalid', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        LETTERBOXD_TAKE_AMOUNT: '10',
        LETTERBOXD_TAKE_STRATEGY: 'invalid'
      };

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should fail when LETTERBOXD_TAKE_AMOUNT is specified without LETTERBOXD_TAKE_STRATEGY', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        LETTERBOXD_TAKE_AMOUNT: '10'
      };

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should fail when LETTERBOXD_TAKE_STRATEGY is specified without LETTERBOXD_TAKE_AMOUNT', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        LETTERBOXD_TAKE_STRATEGY: 'newest'
      };

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('error reporting', () => {
    it('should log detailed error messages for multiple validation failures', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'invalid',
        LOG_LEVEL: 'invalid',
        CHECK_INTERVAL_MINUTES: '5'
      };
      delete process.env.LETTERBOXD_USERNAME;
      delete process.env.DATA_DIR;

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('Environment validation failed:');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      
      // Should have called console.error multiple times for different errors
      expect(mockConsoleError.mock.calls.length).toBeGreaterThan(1);
    });

    it('should provide helpful error message for movie limiting validation', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        LETTERBOXD_TAKE_AMOUNT: '10'
      };

      expect(() => {
        require('./env');
      }).toThrow('process.exit called');

      // Check that the custom error message is displayed
      const errorCalls = mockConsoleError.mock.calls;
      const hasMovieLimitingError = errorCalls.some(call => 
        call[0].includes('When using movie limiting, both LETTERBOXD_TAKE_AMOUNT and LETTERBOXD_TAKE_STRATEGY must be specified')
      );
      expect(hasMovieLimitingError).toBe(true);
    });
  });

  describe('type inference', () => {
    it('should provide correct TypeScript types', () => {
      process.env = {
        ...originalEnv,
        LETTERBOXD_USERNAME: 'testuser',
        DATA_DIR: '/data',
        RADARR_API_URL: 'http://localhost:7878',
        RADARR_API_KEY: 'test-key',
        RADARR_QUALITY_PROFILE: 'HD-1080p',
        LETTERBOXD_TAKE_AMOUNT: '10',
        LETTERBOXD_TAKE_STRATEGY: 'newest'
      };

      const env = require('./env').default;
      
      // Test that values have correct types
      expect(typeof env.LETTERBOXD_USERNAME).toBe('string');
      expect(typeof env.DATA_DIR).toBe('string');
      expect(typeof env.RADARR_API_URL).toBe('string');
      expect(typeof env.RADARR_API_KEY).toBe('string');
      expect(typeof env.RADARR_QUALITY_PROFILE).toBe('string');
      expect(typeof env.CHECK_INTERVAL_MINUTES).toBe('number');
      expect(typeof env.LETTERBOXD_TAKE_AMOUNT).toBe('number');
      expect(typeof env.LETTERBOXD_TAKE_STRATEGY).toBe('string');
      
      // Test enum values
      expect(['development', 'production', 'test']).toContain(env.NODE_ENV);
      expect(['error', 'warn', 'info', 'debug']).toContain(env.LOG_LEVEL);
      expect(['newest', 'oldest']).toContain(env.LETTERBOXD_TAKE_STRATEGY);
    });
  });
});