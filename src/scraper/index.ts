import { ListScraper } from './list';
import env from '../util/env';

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
  [ListType.REGULAR_LIST]: /^https:\/\/letterboxd\.com\/[^\/]+\/list\/[^\/]+\/?$/,
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

export const fetchMoviesFromUrl = async (url: string): Promise<LetterboxdMovie[]> => {
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
      // TODO: Implement collections scraping
      throw new Error('Collections scraping not implemented');
      
    case ListType.POPULAR_MOVIES:
      // TODO: Implement popular movies scraping
      throw new Error('Popular movies scraping not implemented');
      
    default:
      throw new Error(`Unsupported list type: ${listType}`);
  }
}