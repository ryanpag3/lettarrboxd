// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Set required environment variables for tests
process.env.LETTERBOXD_URL = 'https://letterboxd.com/user/watchlist';
process.env.RADARR_API_URL = 'http://localhost:7878';
process.env.RADARR_API_KEY = 'test-key';
process.env.RADARR_QUALITY_PROFILE = 'HD-1080p';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// FlareSolverr URL for integration tests (bypasses Cloudflare protection)
// Unit tests mock the http-client module so this won't affect them
process.env.FLARESOLVERR_URL = 'http://localhost:8191/v1';

// Mock process.exit to prevent tests from exiting
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit called with ${code}`);
});

// Clean up after all tests
afterAll(() => {
  mockExit.mockRestore();
});
