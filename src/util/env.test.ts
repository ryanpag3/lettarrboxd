describe('env', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should validate and parse environment variables correctly', () => {
    process.env = {
      NODE_ENV: 'test',
      LOG_LEVEL: 'info',
      LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      RADARR_MINIMUM_AVAILABILITY: 'released',
      CHECK_INTERVAL_MINUTES: '15',
      DRY_RUN: 'false',
      RADARR_ADD_UNMONITORED: 'false'
    };

    const env = require('./env').default;

    expect(env.NODE_ENV).toBe('test');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.LETTERBOXD_URL).toBe('https://letterboxd.com/user/watchlist');
    expect(env.RADARR_API_URL).toBe('http://localhost:7878');
    expect(env.RADARR_API_KEY).toBe('test-api-key');
    expect(env.RADARR_QUALITY_PROFILE).toBe('HD-1080p');
    expect(env.CHECK_INTERVAL_MINUTES).toBe(15);
    expect(env.DRY_RUN).toBe(false);
    expect(env.RADARR_ADD_UNMONITORED).toBe(false);
  });

  it('should apply default values for optional fields', () => {
    process.env = {
      NODE_ENV: 'production',
      LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
    };

    const env = require('./env').default;

    expect(env.NODE_ENV).toBe('production');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.RADARR_MINIMUM_AVAILABILITY).toBe('released');
    expect(env.CHECK_INTERVAL_MINUTES).toBe(10);
    expect(env.DRY_RUN).toBe(false);
    expect(env.RADARR_ADD_UNMONITORED).toBe(false);
  });

  it('should transform CHECK_INTERVAL_MINUTES to number', () => {
    process.env = {
      NODE_ENV: 'test',
      LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      CHECK_INTERVAL_MINUTES: '30',
    };

    const env = require('./env').default;
    expect(typeof env.CHECK_INTERVAL_MINUTES).toBe('number');
    expect(env.CHECK_INTERVAL_MINUTES).toBe(30);
  });

  it('should transform boolean strings correctly', () => {
    process.env = {
      NODE_ENV: 'test',
      LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      DRY_RUN: 'true',
      RADARR_ADD_UNMONITORED: 'TRUE',
    };

    const env = require('./env').default;
    expect(env.DRY_RUN).toBe(true);
    expect(env.RADARR_ADD_UNMONITORED).toBe(true);
  });

  it('should parse LETTERBOXD_TAKE_AMOUNT and LETTERBOXD_TAKE_STRATEGY together', () => {
    process.env = {
      NODE_ENV: 'test',
      LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      LETTERBOXD_TAKE_AMOUNT: '5',
      LETTERBOXD_TAKE_STRATEGY: 'newest',
    };

    const env = require('./env').default;
    expect(env.LETTERBOXD_TAKE_AMOUNT).toBe(5);
    expect(env.LETTERBOXD_TAKE_STRATEGY).toBe('newest');
  });

  it('should handle optional RADARR_ROOT_FOLDER_ID', () => {
    process.env = {
      NODE_ENV: 'test',
      LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      RADARR_ROOT_FOLDER_ID: '1',
    };

    const env = require('./env').default;
    expect(env.RADARR_ROOT_FOLDER_ID).toBe('1');
  });

  it('should handle optional RADARR_TAGS', () => {
    process.env = {
      NODE_ENV: 'test',
      LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      RADARR_TAGS: 'tag1,tag2',
    };

    const env = require('./env').default;
    expect(env.RADARR_TAGS).toBe('tag1,tag2');
  });

  it('should fail validation when LETTERBOXD_TAKE_AMOUNT is set without LETTERBOXD_TAKE_STRATEGY', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    process.env = {
      NODE_ENV: 'test',
      LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      LETTERBOXD_TAKE_AMOUNT: '5',
    };

    expect(() => {
      jest.isolateModules(() => {
        require('./env');
      });
    }).toThrow('process.exit called');

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should fail validation when LETTERBOXD_TAKE_STRATEGY is set without LETTERBOXD_TAKE_AMOUNT', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    process.env = {
      NODE_ENV: 'test',
      LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      LETTERBOXD_TAKE_STRATEGY: 'newest',
    };

    expect(() => {
      jest.isolateModules(() => {
        require('./env');
      });
    }).toThrow('process.exit called');

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should fail validation when required field is missing', () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    process.env = {
      NODE_ENV: 'test',
      RADARR_API_URL: 'http://localhost:7878',
      RADARR_API_KEY: 'test-api-key',
      RADARR_QUALITY_PROFILE: 'HD-1080p',
      // Missing LETTERBOXD_URL
    };

    expect(() => {
      jest.isolateModules(() => {
        require('./env');
      });
    }).toThrow('process.exit called');

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });
});
