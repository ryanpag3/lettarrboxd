import { fetchHtml, isFlareSolverrEnabled } from './http-client';

// Mock the logger
jest.mock('./logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock the env module
jest.mock('./env', () => ({
  default: {
    FLARESOLVERR_URL: undefined,
    FLARESOLVERR_MAX_TIMEOUT: 60000,
    FLARESOLVERR_SESSION: undefined,
  },
}));

// Get access to the mocked env for manipulation
import env from './env';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('http-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env values
    (env as any).FLARESOLVERR_URL = undefined;
    (env as any).FLARESOLVERR_MAX_TIMEOUT = 60000;
    (env as any).FLARESOLVERR_SESSION = undefined;
  });

  describe('isFlareSolverrEnabled', () => {
    it('should return false when FLARESOLVERR_URL is not set', () => {
      expect(isFlareSolverrEnabled()).toBe(false);
    });

    it('should return true when FLARESOLVERR_URL is set', () => {
      (env as any).FLARESOLVERR_URL = 'http://localhost:8191/v1';
      expect(isFlareSolverrEnabled()).toBe(true);
    });
  });

  describe('fetchHtml - direct fetch', () => {
    it('should use direct fetch when FlareSolverr is not configured', async () => {
      const mockHtml = '<html><body>Test</body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      });

      const result = await fetchHtml('https://example.com/page');

      expect(result).toEqual({
        html: mockHtml,
        statusCode: 200,
      });
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/page');
    });

    it('should throw error when direct fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(fetchHtml('https://example.com/notfound')).rejects.toThrow(
        'HTTP request failed: 404 Not Found'
      );
    });
  });

  describe('fetchHtml - FlareSolverr', () => {
    beforeEach(() => {
      (env as any).FLARESOLVERR_URL = 'http://localhost:8191/v1';
    });

    it('should use FlareSolverr when configured', async () => {
      const mockHtml = '<html><body>Solved</body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          message: '',
          solution: {
            url: 'https://example.com/page',
            status: 200,
            response: mockHtml,
            cookies: [],
            userAgent: 'Mozilla/5.0',
          },
        }),
      });

      const result = await fetchHtml('https://example.com/page');

      expect(result).toEqual({
        html: mockHtml,
        statusCode: 200,
      });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8191/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cmd: 'request.get',
          url: 'https://example.com/page',
          maxTimeout: 60000,
        }),
      });
    });

    it('should include session parameter when configured', async () => {
      (env as any).FLARESOLVERR_SESSION = 'my-session';
      const mockHtml = '<html><body>Solved</body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          message: '',
          solution: {
            url: 'https://example.com/page',
            status: 200,
            response: mockHtml,
            cookies: [],
            userAgent: 'Mozilla/5.0',
          },
        }),
      });

      await fetchHtml('https://example.com/page');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8191/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cmd: 'request.get',
          url: 'https://example.com/page',
          maxTimeout: 60000,
          session: 'my-session',
        }),
      });
    });

    it('should use custom timeout when configured', async () => {
      (env as any).FLARESOLVERR_MAX_TIMEOUT = 120000;
      const mockHtml = '<html><body>Solved</body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          message: '',
          solution: {
            url: 'https://example.com/page',
            status: 200,
            response: mockHtml,
            cookies: [],
            userAgent: 'Mozilla/5.0',
          },
        }),
      });

      await fetchHtml('https://example.com/page');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.maxTimeout).toBe(120000);
    });

    it('should throw error when FlareSolverr request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchHtml('https://example.com/page')).rejects.toThrow(
        'FlareSolverr request failed: 500 Internal Server Error'
      );
    });

    it('should throw error when FlareSolverr returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'error',
          message: 'Challenge not solved',
          solution: null,
        }),
      });

      await expect(fetchHtml('https://example.com/page')).rejects.toThrow(
        'FlareSolverr error: Challenge not solved'
      );
    });
  });
});
