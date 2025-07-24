import Axios from 'axios';
import env from './env';
import logger from './logger';

const axios = Axios.create({
    baseURL: env.RADARR_API_URL,
    headers: {
        'X-Api-Key': env.RADARR_API_KEY
    }
});

export async function lookupMovieInRadarr(tmdbId: string): Promise<any> {
    try {
        logger.info(`Looking up TMDB ID ${tmdbId} in Radarr...`);
        
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
        logger.info(`Checking if TMDB ID ${tmdbId} exists in Radarr...`);
        
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
        logger.info(`Getting quality profile ID for: ${profileName}`);
        
        const response = await axios.get('/api/v3/qualityprofile');
        const profiles = response.data;
        
        const profile = profiles.find((p: any) => p.name === profileName);
        if (profile) {
            logger.info(`Found quality profile: ${profileName} (ID: ${profile.id})`);
            return profile.id;
        } else {
            logger.error(`Quality profile not found: ${profileName}`);
            logger.info('Available profiles:', profiles.map((p: any) => p.name));
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
            logger.info(`Using root folder: ${rootFolder}`);
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

export async function getOrCreateTag(tagName: string): Promise<number | null> {
    try {
        logger.info(`Getting or creating tag: ${tagName}`);
        
        const response = await axios.get('/api/v3/tag');
        const tags = response.data;
        
        const existingTag = tags.find((tag: any) => tag.label === tagName);
        if (existingTag) {
            logger.info(`Tag already exists: ${tagName} (ID: ${existingTag.id})`);
            return existingTag.id;
        }
        
        logger.info(`Creating new tag: ${tagName}`);
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

export async function addMovie(tmdbId: string, movieData: any): Promise<any> {
    try {
        if (!movieData) {
            logger.error(`No movie data provided for TMDB ID: ${tmdbId}`);
            return null;
        }
        
        logger.info(`Adding movie to Radarr: ${movieData.title} (TMDB: ${tmdbId})`);
        
        const qualityProfileId = await getQualityProfileId(env.RADARR_QUALITY_PROFILE);
        if (!qualityProfileId) {
            throw new Error(`Could not find quality profile: ${env.RADARR_QUALITY_PROFILE}`);
        }
        
        const rootFolderPath = await getRootFolder();
        if (!rootFolderPath) {
            throw new Error('Could not get root folder');
        }
        
        const tagId = await getOrCreateTag('letterboxd-watchlist');
        const tags = tagId ? [tagId] : [];
        
        const addMoviePayload = {
            title: movieData.title,
            qualityProfileId: qualityProfileId,
            rootFolderPath: rootFolderPath,
            tmdbId: parseInt(tmdbId),
            minimumAvailability: env.RADARR_MINIMUM_AVAILABILITY,
            monitored: true,
            tags: tags,
            addOptions: {
                searchForMovie: true
            }
        };
        
        logger.debug('Adding movie with payload:', addMoviePayload);
        
        const response = await axios.post('/api/v3/movie', addMoviePayload);
        
        logger.info(`Successfully added movie: ${movieData.title}`, response.data);
        return response.data;
    } catch (error) {
        logger.error(`Error adding movie ${movieData.title} (TMDB: ${tmdbId}):`, error);
        return null;
    }
}