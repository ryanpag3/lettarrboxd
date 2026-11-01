jest.mock('../util/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockEnv: { FLARESOLVERR_URL?: string; FLARESOLVERR_MAX_TIMEOUT: number } = {
  FLARESOLVERR_URL: undefined,
  FLARESOLVERR_MAX_TIMEOUT: 60000,
};
jest.mock('../util/env', () => ({
  __esModule: true,
  default: mockEnv,
}));

import { fetchPage } from './fetch';

global.fetch = jest.fn();

describe('fetchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnv.FLARESOLVERR_URL = undefined;
  });

  it('should fetch directly when FlareSolverr is not configured', async () => {
    const directResponse = { ok: true, text: async () => '<html></html>' };
    (global.fetch as jest.Mock).mockResolvedValueOnce(directResponse);

    const response = await fetchPage('https://letterboxd.com/film/the-matrix/');

    expect(global.fetch).toHaveBeenCalledWith('https://letterboxd.com/film/the-matrix/');
    expect(response).toBe(directResponse);
  });

  it('should proxy through FlareSolverr when configured', async () => {
    mockEnv.FLARESOLVERR_URL = 'http://flaresolverr:8191/';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'ok',
        message: 'Challenge not detected!',
        solution: { url: 'https://letterboxd.com/film/the-matrix/', status: 200, response: '<html>matrix</html>' },
      }),
    });

    const response = await fetchPage('https://letterboxd.com/film/the-matrix/');

    expect(global.fetch).toHaveBeenCalledWith('http://flaresolverr:8191/v1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: 'request.get',
        url: 'https://letterboxd.com/film/the-matrix/',
        maxTimeout: 60000,
      }),
    });
    expect(response.ok).toBe(true);
    expect(await response.text()).toBe('<html>matrix</html>');
  });

  it('should pass through the upstream status code from FlareSolverr', async () => {
    mockEnv.FLARESOLVERR_URL = 'http://flaresolverr:8191';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'ok',
        message: '',
        solution: { url: 'https://letterboxd.com/film/missing/', status: 404, response: 'Not found' },
      }),
    });

    const response = await fetchPage('https://letterboxd.com/film/missing/');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it('should throw when FlareSolverr reports an error', async () => {
    mockEnv.FLARESOLVERR_URL = 'http://flaresolverr:8191';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'error', message: 'Error solving the challenge. Timeout after 60.0 seconds.' }),
    });

    await expect(fetchPage('https://letterboxd.com/film/the-matrix/')).rejects.toThrow(
      'FlareSolverr could not fetch https://letterboxd.com/film/the-matrix/: Error solving the challenge. Timeout after 60.0 seconds.'
    );
  });

  it('should throw when the FlareSolverr request itself fails', async () => {
    mockEnv.FLARESOLVERR_URL = 'http://flaresolverr:8191';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchPage('https://letterboxd.com/film/the-matrix/')).rejects.toThrow(
      'FlareSolverr request failed: 500 Internal Server Error'
    );
  });
});
