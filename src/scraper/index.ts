import { ListScraper } from './list';
import { CollectionsScraper } from './collections';
import { PopularScraper } from './popular';
import env from '../util/env';
import logger from '../util/logger';

export interface LetterboxdMovie {
    id: number;
    name: string;
    imdbId?: string|null;
    tmdbId?: string|null;
    publishedYear?: number|null;
    slug: string;
}

export enum ListType {
  WATCHLIST = 'watchlist',
  REGULAR_LIST = 'regular_list',
  WATCHED_MOVIES = 'watched_movies',
  ACTOR_FILMOGRAPHY = 'actor_filmography',
  DIRECTOR_FILMOGRAPHY = 'director_filmography',
  WRITER_FILMOGRAPHY = 'writer_filmography',
  COLLECTIONS = 'collections',
  POPULAR_MOVIES = 'popular_movies'
}

export const LETTERBOXD_BASE_URL = 'https://letterboxd.com';

const URL_PATTERNS = {
  [ListType.WATCHLIST]: /^https:\/\/letterboxd\.com\/[^\/]+\/watchlist\/?$/,
  [ListType.REGULAR_LIST]: /^https:\/\/letterboxd\.com\/[^\/]+\/list\/[^\/]+(\/share\/[^\/]+)?\/?$/,
  [ListType.WATCHED_MOVIES]: /^https:\/\/letterboxd\.com\/[^\/]+\/films\/?$/,
  [ListType.ACTOR_FILMOGRAPHY]: /^https:\/\/letterboxd\.com\/actor\/[^\/]+\/?$/,
  [ListType.DIRECTOR_FILMOGRAPHY]: /^https:\/\/letterboxd\.com\/director\/[^\/]+\/?$/,
  [ListType.WRITER_FILMOGRAPHY]: /^https:\/\/letterboxd\.com\/writer\/[^\/]+\/?$/,
  [ListType.COLLECTIONS]: /^https:\/\/letterboxd\.com\/films\/in\/[^\/]+\/?$/,
  [ListType.POPULAR_MOVIES]: /^https:\/\/letterboxd\.com\/films\/popular\/?$/
};

export const detectListType = (url: string): ListType | null => {
  for (const [listType, pattern] of Object.entries(URL_PATTERNS)) {
    if (pattern.test(url)) {
      return listType as ListType;
    }
  }
  return null;
};

const SHORT_LINK_PATTERN = /^https?:\/\/boxd\.it\/[^\/]+\/?$/;


export const resolveShortLink = async (url: string): Promise<string> => {
  if (!SHORT_LINK_PATTERN.test(url)) {
    return url;
  }

  const response = await fetch(url, { redirect: 'manual' });
  const location = response.headers.get('location');

  if (response.status < 300 || response.status >= 400 || !location) {
    throw new Error(`Could not resolve short link ${url}: ${response.status}`);
  }

  const resolved = new URL(location, url).toString();
  logger.debug(`Resolved short link ${url} to ${resolved}`);
  return resolved;
};

export const fetchMoviesFromUrl = async (inputUrl: string): Promise<LetterboxdMovie[]> => {
  const url = await resolveShortLink(inputUrl);
  const listType = detectListType(url);
  
  if (!listType) {
    throw new Error(`Unsupported URL format: ${url}`);
  }
  
  switch (listType) {
    case ListType.ACTOR_FILMOGRAPHY:
    case ListType.DIRECTOR_FILMOGRAPHY:
    case ListType.WRITER_FILMOGRAPHY:
    case ListType.WATCHLIST:
    case ListType.REGULAR_LIST:
    case ListType.WATCHED_MOVIES:
      // Filmography pages, lists, and watched movies use the same HTML structure
      // Determine take parameters from environment variables
      let take: number | undefined = undefined;
      let strategy: 'oldest' | 'newest' | undefined = undefined;

      if (env.LETTERBOXD_TAKE_AMOUNT && env.LETTERBOXD_TAKE_STRATEGY) {
        take = env.LETTERBOXD_TAKE_AMOUNT;
        strategy = env.LETTERBOXD_TAKE_STRATEGY;
      }

      const listScraper = new ListScraper(url, take, strategy);
      return listScraper.getMovies();

    case ListType.COLLECTIONS:
      // Collections load movies via AJAX endpoint
      let collectionTake: number | undefined = undefined;
      let collectionStrategy: 'oldest' | 'newest' | undefined = undefined;

      if (env.LETTERBOXD_TAKE_AMOUNT && env.LETTERBOXD_TAKE_STRATEGY) {
        collectionTake = env.LETTERBOXD_TAKE_AMOUNT;
        collectionStrategy = env.LETTERBOXD_TAKE_STRATEGY;
      }

      const collectionsScraper = new CollectionsScraper(url, collectionTake, collectionStrategy);
      return collectionsScraper.getMovies();

    case ListType.POPULAR_MOVIES:
      // Popular movies load via AJAX endpoint
      let popularTake: number | undefined = undefined;
      let popularStrategy: 'oldest' | 'newest' | undefined = undefined;

      if (env.LETTERBOXD_TAKE_AMOUNT && env.LETTERBOXD_TAKE_STRATEGY) {
        popularTake = env.LETTERBOXD_TAKE_AMOUNT;
        popularStrategy = env.LETTERBOXD_TAKE_STRATEGY;
      }

      const popularScraper = new PopularScraper(url, popularTake, popularStrategy);
      return popularScraper.getMovies();
      
    default:
      throw new Error(`Unsupported list type: ${listType}`);
  }
}