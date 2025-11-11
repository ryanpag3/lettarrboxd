import pino from 'pino';

jest.mock('./env', () => ({
  LOG_LEVEL: 'info',
  NODE_ENV: 'test',
  LETTERBOXD_URL: 'https://letterboxd.com/user/watchlist',
  RADARR_API_URL: 'http://localhost:7878',
  RADARR_API_KEY: 'test-key',
  RADARR_QUALITY_PROFILE: 'HD-1080p',
  RADARR_MINIMUM_AVAILABILITY: 'released',
  CHECK_INTERVAL_MINUTES: 10,
  DRY_RUN: false,
  RADARR_ADD_UNMONITORED: false
}));

describe('logger', () => {
  it('should create a pino logger instance', () => {
    const logger = require('./logger').default;
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('should use the configured log level from env', () => {
    const logger = require('./logger').default;
    expect(logger.level).toBe('info');
  });
});
