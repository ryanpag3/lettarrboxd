import Axios from 'axios';
import env from '../util/env';
import logger from '../util/logger';
import { LetterboxdMovie } from '../scraper';
import Bluebird from 'bluebird';

interface RadarrMovie {
    title: string;
    qualityProfileId: number;
    rootFolderPath: string;
    tmdbId: number;
    minimumAvailability: string;
    monitored: boolean;
    tags: number[];
    addOptions: {
        searchForMovie: boolean;
    }
}

const DEFAULT_TAG_NAME = 'letterboxd';

const axios = Axios.create({
    baseURL: env.RADARR_API_URL,
    headers: {
        'X-Api-Key': env.RADARR_API_KEY
    }
});

export async function lookupMovieInRadarr(tmdbId: string): Promise<any> {
    try {
        logger.debug(`Looking up TMDB ID ${tmdbId} in Radarr...`);

        const response = await axios.get(`/api/v3/movie/lookup/tmdb`, {
            params: {
                tmdbId: tmdbId
            }
        });

        logger.debug(`Radarr response for TMDB ID ${tmdbId}:`, response.data);
        return response.data;
    } catch (error) {
        logger.error(`Error looking up TMDB ID ${tmdbId} in Radarr:`, error);
        return null;
    }
}

export async function checkMovieInRadarr(tmdbId: string): Promise<any> {
    try {
        logger.debug(`Checking if TMDB ID ${tmdbId} exists in Radarr...`);

        const response = await axios.get('/api/v3/movie', {
            params: {
                tmdbId: tmdbId
            }
        });

        logger.debug(`Radarr library check for TMDB ID ${tmdbId}:`, response.data);
        return response.data;
    } catch (error) {
        logger.error(`Error checking TMDB ID ${tmdbId} in Radarr library:`, error);
        return null;
    }
}

export async function getQualityProfileId(profileName: string): Promise<number | null> {
    try {
        logger.debug(`Getting quality profile ID for: ${profileName}`);

        const response = await axios.get('/api/v3/qualityprofile');
        const profiles = response.data;

        const profile = profiles.find((p: any) => p.name === profileName);
        if (profile) {
            logger.debug(`Found quality profile: ${profileName} (ID: ${profile.id})`);
            return profile.id;
        } else {
            logger.error(`Quality profile not found: ${profileName}`);
            logger.debug('Available profiles:', profiles.map((p: any) => p.name));
            return null;
        }
    } catch (error) {
        logger.error('Error getting quality profiles:', error);
        return null;
    }
}

export async function getRootFolder(): Promise<string | null> {
    try {
        const response = await axios.get('/api/v3/rootfolder');
        const rootFolders = response.data;

        if (rootFolders.length > 0) {
            const rootFolder = rootFolders[0].path;
            logger.debug(`Using root folder: ${rootFolder}`);
            return rootFolder;
        } else {
            logger.error('No root folders found in Radarr');
            return null;
        }
    } catch (error) {
        logger.error('Error getting root folders:', error);
        return null;
    }
}

export async function getRootFolderById(id: string) {
    try {
        const response = await axios.get(`/api/v3/rootfolder/${id}`);
        const { data } = response;
        if (data) {
            return data.path;
        } else {
            return null;
        }
    } catch (e) {
        logger.error(`Error getting root folder by id: ${id}`);
        return null;
    }
}

export async function getOrCreateTag(tagName: string): Promise<number | null> {
    try {
        logger.debug(`Getting or creating tag: ${tagName}`);

        const response = await axios.get('/api/v3/tag');
        const tags = response.data;

        const existingTag = tags.find((tag: any) => tag.label === tagName);
        if (existingTag) {
            logger.debug(`Tag already exists: ${tagName} (ID: ${existingTag.id})`);
            return existingTag.id;
        }

        logger.debug(`Creating new tag: ${tagName}`);
        const createResponse = await axios.post('/api/v3/tag', {
            label: tagName
        });

        logger.info(`Created tag: ${tagName} (ID: ${createResponse.data.id})`);
        return createResponse.data.id;
    } catch (error) {
        logger.error(`Error getting or creating tag ${tagName}:`, error);
        return null;
    }
}

function parseConfiguredTags(): string[] {
    const tags = [DEFAULT_TAG_NAME];
    
    if (env.RADARR_TAGS) {
        const userTags = env.RADARR_TAGS
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        tags.push(...userTags);
    }
    
    return [...new Set(tags)];
}

export async function getAllRequiredTagIds(): Promise<number[]> {
    const tagNames = parseConfiguredTags();
    const tagIds: number[] = [];
    
    for (const tagName of tagNames) {
        const tagId = await getOrCreateTag(tagName);
        if (tagId) {
            tagIds.push(tagId);
        }
    }
    
    return tagIds;
}

export async function upsertMovies(movies: LetterboxdMovie[]): Promise<void> {
    const qualityProfileId = await getQualityProfileId(env.RADARR_QUALITY_PROFILE);

    if (!qualityProfileId) {
        throw new Error('Could not get quality profile ID.');
    }

    const rootFolderPath = !env.RADARR_ROOT_FOLDER_ID ? await getRootFolder() : await getRootFolderById(env.RADARR_ROOT_FOLDER_ID);
    
    if (!rootFolderPath) {
        throw new Error('Could not get root folder');
    }

    const tagIds = await getAllRequiredTagIds();

    if (tagIds.length === 0) {
        throw new Error('Could not get any tag IDs.');
    }

    await Bluebird.map(movies, movie => {
        return addMovie(movie, qualityProfileId, rootFolderPath, tagIds, env.RADARR_MINIMUM_AVAILABILITY);
    });
}

export async function addMovie(movie: LetterboxdMovie, qualityProfileId: number, rootFolderPath: string, tagIds: number[], minimumAvailability: string): Promise<void> {
    try {
        logger.debug(`Adding movie to Radarr: ${movie.name}`);

        if (!movie.tmdbId) {
            logger.info(`Could not add movie ${movie.name} because no tmdb id was found. Is this a TV show?`);
            return;
        }

        const payload: RadarrMovie = {
            title: movie.name,
            qualityProfileId,
            rootFolderPath,
            tmdbId: parseInt(movie.tmdbId),
            minimumAvailability,
            monitored: true,
            tags: tagIds,
            addOptions: {
                searchForMovie: true
            }
        }

        if (env.DRY_RUN) {
            logger.info(`[DRY RUN] Would add movie to Radarr: ${payload.title} (TMDB: ${payload.tmdbId})`, payload);
            return;
        }

        const response = await axios.post('/api/v3/movie', payload);

        logger.info(`Successfully added movie: ${payload.title}`, response.data);
        return response.data;
    } catch (e: any) {
        if (e.response?.status === 400 && (JSON.stringify(e.response?.data)).includes('This movie has already been added')) {
            logger.debug(`Movie ${movie.name} already exists in Radarr, skipping`);
            return;
        }
        logger.error(`Error adding movie ${movie.name} (TMDB: ${movie.tmdbId}):`, e);
    }
}