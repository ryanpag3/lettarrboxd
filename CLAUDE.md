# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Watchlistarr is a TypeScript Node.js application that automatically syncs Letterboxd watchlist movies to Radarr. It monitors a user's Letterboxd watchlist for new additions and automatically adds them to Radarr for download management.

## Commands

### Development
- `yarn install` - Install dependencies
- `yarn start:dev` - Run with auto-reload during development using nodemon
- `yarn ts-node src/index.ts` - Run the main TypeScript file directly

### TypeScript
- `yarn tsc` - Compile TypeScript (outputs to current directory based on tsconfig.json)
- `yarn tsc --noEmit` - Type check without emitting files

### Docker
- `docker build -t watchlistarr .` - Build Docker image
- `docker run -d --env-file .env -v ./data:/data watchlistarr` - Run container

## Environment Variables

Required environment variables (create `.env` file):

```bash
# Letterboxd Configuration
LETTERBOXD_USERNAME=your_username

# Radarr Configuration
RADARR_API_URL=http://your-radarr:7878
RADARR_API_KEY=your_api_key
RADARR_QUALITY_PROFILE=HD-1080p
RADARR_MINIMUM_AVAILABILITY=released

# Application Configuration
DATA_DIR=/data
CHECK_INTERVAL_MINUTES=60
NODE_ENV=production
LOG_LEVEL=info
```

## Project Structure

```
src/
├── index.ts          # Main application entry point with scheduler
├── env.ts            # Environment variable validation using Zod
├── letterboxd.ts     # Letterboxd watchlist scraping and TMDB ID extraction
└── radarr.ts         # Radarr API integration for movie management

.github/workflows/
└── build-docker.yml  # GitHub Actions workflow for Docker builds

Dockerfile            # Multi-stage Docker build configuration
.dockerignore         # Docker build context exclusions
```

## Key Dependencies

- **axios**: HTTP client for API requests and web scraping
- **cheerio**: Server-side jQuery for HTML parsing
- **zod**: TypeScript-first schema validation for environment variables
- **dotenv**: Environment variable loading from .env files
- **nodemon**: Development auto-reload tool
- **ts-node**: TypeScript execution environment
- **typescript**: TypeScript compiler

## Architecture Notes

### Core Features
- **Scheduled Monitoring**: Runs continuously checking for new watchlist movies every N minutes
- **Incremental Processing**: Only processes new movies since last run (tracked in movies.json)
- **Development Mode**: Limits processing to first 5 movies when NODE_ENV=development
- **Multi-page Support**: Handles paginated Letterboxd watchlists
- **TMDB Integration**: Extracts TMDB IDs from Letterboxd movie pages
- **Radarr Integration**: Adds movies with quality profiles, tags, and monitoring
- **Docker Support**: Production-ready containerization with multi-architecture builds

### Key Functions

#### `src/index.ts`
- **`processWatchlist()`**: Main orchestration function for watchlist processing
- **`addMovieToRadarr(movie)`**: Handles individual movie addition to Radarr
- **`startScheduledMonitoring()`**: Sets up recurring watchlist checks

#### `src/letterboxd.ts`
- **`getWatchlistMovies()`**: Fetches all movies from Letterboxd watchlist
- **`getAllWatchlistUrls()`**: Handles pagination across all watchlist pages
- **`getTmdbIdFromMoviePage(url)`**: Extracts TMDB ID from individual movie pages

#### `src/radarr.ts`
- **`addMovie(tmdbId, movieData)`**: Adds movie to Radarr with quality profile and tags
- **`checkMovieInRadarr(tmdbId)`**: Checks if movie already exists in Radarr
- **`getOrCreateTag(tagName)`**: Creates "letterboxd-watchlist" tag for organization

### Error Handling
- Graceful handling of network failures and API errors
- Rate limiting with delays between requests to be respectful to services
- Comprehensive logging for debugging and monitoring

### Security
- Environment variable validation with minimum value constraints
- Non-root Docker user for container security
- No hardcoded credentials or sensitive data

## Docker Deployment

The application is built as a Docker image and published to Docker Hub at `ryanpage/watchlistarr`.

### GitHub Actions
- Automated builds on push to main/develop branches
- Multi-platform support (AMD64/ARM64)
- Security scanning with Trivy
- Semantic versioning support for releases

### Container Features
- Alpine Linux base for minimal image size
- Non-root user execution for security
- Health checks for container monitoring
- Volume mount for persistent data storage