# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Watchlistarr is a TypeScript Node.js application that automatically syncs Letterboxd watchlist movies to Radarr. It continuously monitors a user's Letterboxd watchlist for new additions and automatically adds them to Radarr for download management.

## Commands

### Development
- `yarn install` - Install dependencies
- `yarn start` - Run the application using ts-node
- `yarn start:dev` - Run with auto-reload during development using nodemon
- `yarn build` - Compile TypeScript to JavaScript
- `yarn tsc --noEmit` - Type check without emitting files

### Docker
- `docker build -t watchlistarr .` - Build Docker image
- `docker run -d --env-file .env -v ./data:/data watchlistarr` - Run container

## Environment Configuration

The application uses Zod for strict environment variable validation in `src/env.ts`. All environment variables are validated at startup and the application will exit with detailed error messages if validation fails.

Required variables:
- `LETTERBOXD_USERNAME` - Letterboxd username for watchlist scraping
- `RADARR_API_URL` - Base URL of Radarr instance  
- `RADARR_API_KEY` - Radarr API key
- `RADARR_QUALITY_PROFILE` - Quality profile name (case-sensitive)

Key validation rules:
- `CHECK_INTERVAL_MINUTES` enforces minimum 10 minutes
- Environment variables are transformed and validated using Zod schemas
- The app exits early with clear error messages for invalid configuration

## Architecture Overview

### Core Application Flow
The application follows a scheduled monitoring pattern:
1. **Scheduler** (`startScheduledMonitoring`) runs `processWatchlist()` at configured intervals
2. **Incremental Processing** - Only new movies (not in previous `movies.json`) are processed
3. **Rate Limiting** - Built-in delays between API calls to respect external services
4. **Persistent State** - Tracks processed movies in `DATA_DIR/movies.json` to avoid reprocessing

### Module Separation
- **`src/index.ts`** - Main orchestration, scheduling, and file I/O operations
- **`src/letterboxd.ts`** - Web scraping and TMDB ID extraction logic
- **`src/radarr.ts`** - Radarr API integration and movie management
- **`src/env.ts`** - Environment validation and configuration management

### Key Architectural Patterns

**State Management**: The application maintains state through a `movies.json` file containing:
```typescript
interface MoviesData {
  timestamp: string;
  queryDate: string; 
  totalMovies: number;
  movies: Movie[];
}
```

**Error Handling**: Each module handles errors gracefully without crashing the scheduler. Network failures and API errors are logged but don't stop the monitoring process.

**Development Mode**: When `NODE_ENV=development`, the application limits processing to the first 5 movies for faster testing cycles.

**Radarr Integration**: Movies are added with:
- Specified quality profile from environment
- "letterboxd-watchlist" tag for organization
- Automatic monitoring and search enabled
- Configurable minimum availability settings

### Web Scraping Strategy
Letterboxd scraping is implemented with:
- **Multi-page support** - Automatically handles paginated watchlists
- **TMDB ID extraction** - Visits individual movie pages to extract TMDB identifiers
- **Rate limiting** - 1 second delays between page requests, 500ms between TMDB extractions
- **Graceful pagination** - Detects end of pages using CSS selectors

### Function Organization
The codebase is organized into small, focused functions:
- `processWatchlist()` - High-level orchestration (19 lines)
- `addMovieToRadarr(movie)` - Individual movie processing
- `processNewMovies(movies)` - Batch processing with delays
- `getAllWatchlistUrls()` - Pagination handling
- `getTmdbIdFromMoviePage(url)` - TMDB ID extraction

## Development Notes

### TypeScript Configuration
- Strict mode enabled with comprehensive type checking
- Uses ts-node for direct TypeScript execution
- All environment variables are strictly typed through Zod inference

### Docker Multi-Stage Build
The Dockerfile uses a production-optimized approach:
- Alpine Linux base for minimal size
- Non-root user for security
- Health checks included
- Multi-architecture support (AMD64/ARM64)

### Rate Limiting Implementation
Built-in delays prevent overwhelming external services:
- 1000ms between Letterboxd page requests
- 1000ms between Radarr API calls  
- 500ms between TMDB ID extractions

### Error Recovery
The application is designed to handle transient failures:
- Individual movie processing failures don't stop the batch
- Network timeouts are caught and logged
- Scheduler continues running even if individual checks fail