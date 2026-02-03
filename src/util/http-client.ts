import env from './env';
import logger from './logger';

export interface HttpResponse {
    html: string;
    statusCode: number;
}

interface FlareSolverrRequest {
    cmd: 'request.get';
    url: string;
    maxTimeout: number;
    session?: string;
}

interface FlareSolverrResponse {
    status: string;
    message: string;
    solution: {
        url: string;
        status: number;
        response: string;
        cookies: Array<{ name: string; value: string; domain: string }>;
        userAgent: string;
    };
}

export function isFlareSolverrEnabled(): boolean {
    return !!env.FLARESOLVERR_URL;
}

export async function fetchHtml(url: string): Promise<HttpResponse> {
    if (isFlareSolverrEnabled()) {
        logger.debug(`Fetching via FlareSolverr: ${url}`);
        return fetchViaFlareSolverr(url);
    }

    logger.debug(`Fetching directly: ${url}`);
    return fetchDirect(url);
}

async function fetchDirect(url: string): Promise<HttpResponse> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP request failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    return {
        html,
        statusCode: response.status,
    };
}

async function fetchViaFlareSolverr(url: string): Promise<HttpResponse> {
    const flareSolverrUrl = env.FLARESOLVERR_URL!;

    const requestBody: FlareSolverrRequest = {
        cmd: 'request.get',
        url,
        maxTimeout: env.FLARESOLVERR_MAX_TIMEOUT,
    };

    if (env.FLARESOLVERR_SESSION) {
        requestBody.session = env.FLARESOLVERR_SESSION;
    }

    const response = await fetch(flareSolverrUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        throw new Error(`FlareSolverr request failed: ${response.status} ${response.statusText}`);
    }

    const data: FlareSolverrResponse = await response.json();

    if (data.status !== 'ok') {
        throw new Error(`FlareSolverr error: ${data.message}`);
    }

    logger.debug(`FlareSolverr solved challenge for: ${url}`);

    return {
        html: data.solution.response,
        statusCode: data.solution.status,
    };
}
