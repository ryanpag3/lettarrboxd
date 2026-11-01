import env from '../util/env';
import logger from '../util/logger';

interface FlareSolverrResponse {
    status: string;
    message: string;
    solution?: {
        url: string;
        status: number;
        response: string;
    };
}

/**
 * Fetch a Letterboxd page. Requests are proxied through FlareSolverr when
 * FLARESOLVERR_URL is configured, otherwise they are made directly.
 */
export async function fetchPage(url: string): Promise<Response> {
    if (!env.FLARESOLVERR_URL) {
        return fetch(url);
    }

    return fetchViaFlareSolverr(env.FLARESOLVERR_URL, url);
}

async function fetchViaFlareSolverr(flareSolverrUrl: string, url: string): Promise<Response> {
    const endpoint = `${flareSolverrUrl.replace(/\/$/, '')}/v1`;
    logger.debug(`Fetching ${url} via FlareSolverr at ${endpoint}`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cmd: 'request.get',
            url,
            maxTimeout: env.FLARESOLVERR_MAX_TIMEOUT
        })
    });

    if (!response.ok) {
        throw new Error(`FlareSolverr request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as FlareSolverrResponse;
    if (data.status !== 'ok' || !data.solution) {
        throw new Error(`FlareSolverr could not fetch ${url}: ${data.message}`);
    }

    return new Response(data.solution.response, { status: data.solution.status });
}
