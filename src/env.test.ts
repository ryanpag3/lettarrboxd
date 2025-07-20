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

  it('should validate valid environment variables', () => {
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
    expect(env.NODE_ENV).toBe('test');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.RADARR_MINIMUM_AVAILABILITY).toBe('released');
    expect(env.CHECK_INTERVAL_MINUTES).toBe(10);
  });

  it('should fail validation when required env vars are missing', () => {
    process.env = { ...originalEnv };
    delete process.env.LETTERBOXD_USERNAME;

    expect(() => {
      require('./env');
    }).toThrow('process.exit called');

    expect(mockProcessExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalledWith('Environment validation failed:');
  });

  it('should enforce minimum CHECK_INTERVAL_MINUTES', () => {
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

  it('should validate TAKE_AMOUNT and TAKE_STRATEGY together', () => {
    process.env = {
      ...originalEnv,
      LETTERBOXD_USERNAME: 'testuser',
      DATA_DIR: '/data',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      TAKE_AMOUNT: '10',
      TAKE_STRATEGY: 'newest'
    };

    const env = require('./env').default;
    
    expect(env.TAKE_AMOUNT).toBe(10);
    expect(env.TAKE_STRATEGY).toBe('newest');
  });

  it('should fail when TAKE_AMOUNT is specified without TAKE_STRATEGY', () => {
    process.env = {
      ...originalEnv,
      LETTERBOXD_USERNAME: 'testuser',
      DATA_DIR: '/data',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      TAKE_AMOUNT: '10'
    };

    expect(() => {
      require('./env');
    }).toThrow('process.exit called');

    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should fail when TAKE_STRATEGY is specified without TAKE_AMOUNT', () => {
    process.env = {
      ...originalEnv,
      LETTERBOXD_USERNAME: 'testuser',
      DATA_DIR: '/data',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      TAKE_STRATEGY: 'newest'
    };

    expect(() => {
      require('./env');
    }).toThrow('process.exit called');

    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });
});