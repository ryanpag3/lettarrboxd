import Axios from 'axios';
import env from './env';

const axios = Axios.create({
    baseURL: env.RADARR_API_URL,
    headers: {
        'X-Api-Key': env.RADARR_API_KEY
    }
});

export async function lookupMovieInRadarr(tmdbId: string): Promise<any> {
    try {
        console.log(`Looking up TMDB ID ${tmdbId} in Radarr...`);
        
        // Radarr lookup endpoint using TMDB ID
        const response = await axios.get(`/api/v3/movie/lookup/tmdb`, {
            params: {
                tmdbId: tmdbId
            }
        });
        
        console.log(`Radarr response for TMDB ID ${tmdbId}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error looking up TMDB ID ${tmdbId} in Radarr:`, error);
        return null;
    }
}

export async function checkMovieInRadarr(tmdbId: string): Promise<any> {
    try {
        console.log(`Checking if TMDB ID ${tmdbId} exists in Radarr...`);
        
        // Check if movie already exists in Radarr library
        const response = await axios.get('/api/v3/movie', {
            params: {
                tmdbId: tmdbId
            }
        });
        
        console.log(`Radarr library check for TMDB ID ${tmdbId}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error checking TMDB ID ${tmdbId} in Radarr library:`, error);
        return null;
    }
}

export async function getQualityProfileId(profileName: string): Promise<number | null> {
    try {
        console.log(`Getting quality profile ID for: ${profileName}`);
        
        const response = await axios.get('/api/v3/qualityprofile');
        const profiles = response.data;
        
        const profile = profiles.find((p: any) => p.name === profileName);
        if (profile) {
            console.log(`Found quality profile: ${profileName} (ID: ${profile.id})`);
            return profile.id;
        } else {
            console.error(`Quality profile not found: ${profileName}`);
            console.log('Available profiles:', profiles.map((p: any) => p.name));
            return null;
        }
    } catch (error) {
        console.error('Error getting quality profiles:', error);
        return null;
    }
}

export async function getRootFolder(): Promise<string | null> {
    try {
        const response = await axios.get('/api/v3/rootfolder');
        const rootFolders = response.data;
        
        if (rootFolders.length > 0) {
            const rootFolder = rootFolders[0].path;
            console.log(`Using root folder: ${rootFolder}`);
            return rootFolder;
        } else {
            console.error('No root folders found in Radarr');
            return null;
        }
    } catch (error) {
        console.error('Error getting root folders:', error);
        return null;
    }
}

export async function getOrCreateTag(tagName: string): Promise<number | null> {
    try {
        console.log(`Getting or creating tag: ${tagName}`);
        
        // Get existing tags
        const response = await axios.get('/api/v3/tag');
        const tags = response.data;
        
        // Check if tag already exists
        const existingTag = tags.find((tag: any) => tag.label === tagName);
        if (existingTag) {
            console.log(`Tag already exists: ${tagName} (ID: ${existingTag.id})`);
            return existingTag.id;
        }
        
        // Create new tag
        console.log(`Creating new tag: ${tagName}`);
        const createResponse = await axios.post('/api/v3/tag', {
            label: tagName
        });
        
        console.log(`Created tag: ${tagName} (ID: ${createResponse.data.id})`);
        return createResponse.data.id;
    } catch (error) {
        console.error(`Error getting or creating tag ${tagName}:`, error);
        return null;
    }
}

export async function addMovie(tmdbId: string, movieData: any): Promise<any> {
    try {
        console.log(`Adding movie to Radarr: ${movieData.title} (TMDB: ${tmdbId})`);
        
        // Get quality profile ID
        const qualityProfileId = await getQualityProfileId(env.RADARR_QUALITY_PROFILE);
        if (!qualityProfileId) {
            throw new Error(`Could not find quality profile: ${env.RADARR_QUALITY_PROFILE}`);
        }
        
        // Get root folder
        const rootFolderPath = await getRootFolder();
        if (!rootFolderPath) {
            throw new Error('Could not get root folder');
        }
        
        // Get or create letterboxd-watchlist tag
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
        
        console.log('Adding movie with payload:', addMoviePayload);
        
        const response = await axios.post('/api/v3/movie', addMoviePayload);
        
        console.log(`Successfully added movie: ${movieData.title}`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error adding movie ${movieData.title} (TMDB: ${tmdbId}):`, error);
        return null;
    }
}