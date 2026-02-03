# Lettarrboxd

Automatically sync your Letterboxd lists to Radarr for seamless movie management.

## Overview

Lettarrboxd is an application that monitors your Letterboxd lists (watchlists, regular lists, watched movies, filmographies, collections, etc.) and automatically pushes new movies to Radarr. It runs continuously, checking for updates at configurable intervals and only processing new additions to avoid duplicate API calls.

## Supported Letterboxd URLs

The application supports various types of Letterboxd URLs for the `LETTERBOXD_URL` environment variable:

- **Watchlists**: `https://letterboxd.com/username/watchlist/`
- **Regular Lists**: `https://letterboxd.com/username/list/list-name/`
- **Watched Movies**: `https://letterboxd.com/username/films/`
- **Collections**: `https://letterboxd.com/films/in/collection-name/`
- **Popular Movies**: `https://letterboxd.com/films/popular/`
- **Actor Filmography**: `https://letterboxd.com/actor/actor-name/`
- **Director Filmography**: `https://letterboxd.com/director/director-name/`
- **Writer Filmography**: `https://letterboxd.com/writer/writer-name/`

### Examples
```bash
# User's watchlist
LETTERBOXD_URL=https://letterboxd.com/moviefan123/watchlist/

# User's custom list
LETTERBOXD_URL=https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/

# User's watched movies
LETTERBOXD_URL=https://letterboxd.com/moviefan123/films/

# Movie collection
LETTERBOXD_URL=https://letterboxd.com/films/in/the-dark-knight-collection/

# Popular movies
LETTERBOXD_URL=https://letterboxd.com/films/popular/

# Another user's list
LETTERBOXD_URL=https://letterboxd.com/criterion/list/the-criterion-collection/

# Actor filmography (e.g., Tom Hanks)
LETTERBOXD_URL=https://letterboxd.com/actor/tom-hanks/

# Director filmography (e.g., Christopher Nolan)
LETTERBOXD_URL=https://letterboxd.com/director/christopher-nolan/

# Writer filmography (e.g., Aaron Sorkin)
LETTERBOXD_URL=https://letterboxd.com/writer/aaron-sorkin/
```

**Note**: All Letterboxd lists must be public for the application to access them.

## Quick Start

### Docker

```bash
docker run -d \
  --name lettarrboxd \
  -e LETTERBOXD_URL=https://letterboxd.com/your_username/watchlist/ \
  -e RADARR_API_URL=http://your-radarr:7878 \
  -e RADARR_API_KEY=your_api_key \
  -e RADARR_QUALITY_PROFILE="HD-1080p" \
  -e RADARR_TAGS="watchlist,must-watch" \
  -e DRY_RUN=false \
  ryanpage/lettarrboxd:latest
```

For testing purposes, you can enable dry run mode:
```bash
docker run -d \
  --name lettarrboxd-test \
  -e LETTERBOXD_URL=https://letterboxd.com/your_username/watchlist/ \
  -e RADARR_API_URL=http://your-radarr:7878 \
  -e RADARR_API_KEY=your_api_key \
  -e RADARR_QUALITY_PROFILE="HD-1080p" \
  -e DRY_RUN=true \
  ryanpage/lettarrboxd:latest
```
See [docker-compose.yaml](./docker-compose.yaml) for complete example.

## Watching Multiple Lists

To monitor multiple Letterboxd lists simultaneously, deploy one lettarrboxd instance per list. Each instance operates independently with its own configuration, allowing you to:

- Watch different lists with different quality profiles
- Use custom tags to organize movies from different sources
- Set different check intervals for each list
- Maintain separate data directories to track each list's state

### Docker Compose Multi-List Example

```yaml
services:
  lettarrboxd-watchlist:
    image: ryanpage/lettarrboxd:latest
    container_name: lettarrboxd-watchlist
    environment:
      - LETTERBOXD_URL=https://letterboxd.com/your_username/watchlist/
      - RADARR_API_URL=http://radarr:7878
      - RADARR_API_KEY=your_api_key
      - RADARR_QUALITY_PROFILE=HD-1080p
      - RADARR_TAGS=watchlist,personal
      - CHECK_INTERVAL_MINUTES=60
    volumes:
      - ./data/watchlist:/data
    restart: unless-stopped

  lettarrboxd-criterion:
    image: ryanpage/lettarrboxd:latest
    container_name: lettarrboxd-criterion
    environment:
      - LETTERBOXD_URL=https://letterboxd.com/criterion/list/the-criterion-collection/
      - RADARR_API_URL=http://radarr:7878
      - RADARR_API_KEY=your_api_key
      - RADARR_QUALITY_PROFILE=HD-1080p
      - RADARR_TAGS=criterion,classics
      - CHECK_INTERVAL_MINUTES=120
    volumes:
      - ./data/criterion:/data
    restart: unless-stopped

  lettarrboxd-nolan:
    image: ryanpage/lettarrboxd:latest
    container_name: lettarrboxd-nolan
    environment:
      - LETTERBOXD_URL=https://letterboxd.com/director/christopher-nolan/
      - RADARR_API_URL=http://radarr:7878
      - RADARR_API_KEY=your_api_key
      - RADARR_QUALITY_PROFILE=Ultra HD
      - RADARR_TAGS=nolan,director-filmography
      - CHECK_INTERVAL_MINUTES=1440  # Check once per day
    volumes:
      - ./data/nolan:/data
    restart: unless-stopped
```

### Docker CLI Multi-List Example

```bash
# Watch your personal watchlist
docker run -d \
  --name lettarrboxd-watchlist \
  -e LETTERBOXD_URL=https://letterboxd.com/your_username/watchlist/ \
  -e RADARR_API_URL=http://radarr:7878 \
  -e RADARR_API_KEY=your_api_key \
  -e RADARR_QUALITY_PROFILE="HD-1080p" \
  -e RADARR_TAGS="watchlist,personal" \
  -e CHECK_INTERVAL_MINUTES=60 \
  -v ./data/watchlist:/data \
  ryanpage/lettarrboxd:latest

# Watch the Criterion Collection
docker run -d \
  --name lettarrboxd-criterion \
  -e LETTERBOXD_URL=https://letterboxd.com/criterion/list/the-criterion-collection/ \
  -e RADARR_API_URL=http://radarr:7878 \
  -e RADARR_API_KEY=your_api_key \
  -e RADARR_QUALITY_PROFILE="HD-1080p" \
  -e RADARR_TAGS="criterion,classics" \
  -e CHECK_INTERVAL_MINUTES=120 \
  -v ./data/criterion:/data \
  ryanpage/lettarrboxd:latest

# Watch Christopher Nolan's filmography
docker run -d \
  --name lettarrboxd-nolan \
  -e LETTERBOXD_URL=https://letterboxd.com/director/christopher-nolan/ \
  -e RADARR_API_URL=http://radarr:7878 \
  -e RADARR_API_KEY=your_api_key \
  -e RADARR_QUALITY_PROFILE="Ultra HD" \
  -e RADARR_TAGS="nolan,director-filmography" \
  -e CHECK_INTERVAL_MINUTES=1440 \
  -v ./data/nolan:/data \
  ryanpage/lettarrboxd:latest
```

### Best Practices for Multi-List Setup

1. **Unique Container Names**: Each instance must have a unique container name (e.g., `lettarrboxd-watchlist`, `lettarrboxd-criterion`)

2. **Separate Data Directories**: Use different volume mounts for each instance to maintain independent state tracking:
   ```yaml
   volumes:
     - ./data/watchlist:/data    # Instance 1
     - ./data/criterion:/data    # Instance 2
   ```

3. **Distinctive Tags**: Use the `RADARR_TAGS` variable to organize movies by source:
   ```yaml
   - RADARR_TAGS=watchlist,personal
   - RADARR_TAGS=criterion,classics
   - RADARR_TAGS=nolan,director-filmography
   ```

4. **Appropriate Check Intervals**: Adjust `CHECK_INTERVAL_MINUTES` based on how frequently each list updates:
   - Personal watchlists: 30-60 minutes
   - Curated lists: 2-24 hours
   - Static collections: 24 hours or more

5. **Quality Profiles**: Each instance can use different quality profiles based on content type:
   ```yaml
   - RADARR_QUALITY_PROFILE=HD-1080p      # Standard content
   - RADARR_QUALITY_PROFILE=Ultra HD       # Premium content
   ```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `LETTERBOXD_URL` | Your Letterboxd list URL | `https://letterboxd.com/moviefan123/watchlist/` |
| `RADARR_API_URL` | Radarr base URL | `http://radarr:7878` |
| `RADARR_API_KEY` | Radarr API key | `abc123...` |
| `RADARR_QUALITY_PROFILE` | Quality profile name in Radarr | `HD-1080p` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHECK_INTERVAL_MINUTES` | `10` | How often to check for new movies (minimum 10) |
| `RADARR_MINIMUM_AVAILABILITY` | `released` | When movie becomes available (`announced`, `inCinemas`, `released`) |
| `RADARR_ROOT_FOLDER_ID` | - | Specific root folder ID to use in Radarr (uses first available if not set) |
| `RADARR_ADD_UNMONITORED` | `false` | When `true`, adds movies to Radarr in an unmonitored state |
| `RADARR_TAGS` | - | Additional tags to apply to movies (comma-separated). Movies are always tagged with `letterboxd` |
| `LETTERBOXD_TAKE_AMOUNT` | - | Number of movies to sync (requires `LETTERBOXD_TAKE_STRATEGY`) |
| `LETTERBOXD_TAKE_STRATEGY` | - | Movie selection strategy: `newest` or `oldest` (requires `LETTERBOXD_TAKE_AMOUNT`) |
| `DRY_RUN` | `false` | When `true`, logs what would be added to Radarr without making actual API calls |
| `DATA_DIR` | `/data` | Directory for storing application data. You generally do not need to worry about this. |
| `FLARESOLVERR_URL` | - | FlareSolverr API URL for bypassing Cloudflare protection (e.g., `http://flaresolverr:8191/v1`) |
| `FLARESOLVERR_MAX_TIMEOUT` | `60000` | Max timeout in milliseconds for FlareSolverr requests (10000-300000) |
| `FLARESOLVERR_SESSION` | - | Optional session name for persistent FlareSolverr browser instance |

## FlareSolverr Support (Optional)

If Letterboxd is blocking requests due to Cloudflare protection, you can use [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) to bypass the challenge. FlareSolverr is a proxy server that uses a headless browser to solve Cloudflare challenges.

### When to Use FlareSolverr

You typically only need FlareSolverr if you're experiencing:
- HTTP 403 Forbidden errors when scraping Letterboxd
- Cloudflare challenge pages blocking requests
- Captcha challenges during scraping

### Docker Compose Example with FlareSolverr

```yaml
services:
  lettarrboxd:
    image: ryanpage/lettarrboxd:latest
    container_name: lettarrboxd
    environment:
      - LETTERBOXD_URL=https://letterboxd.com/your_username/watchlist/
      - RADARR_API_URL=http://radarr:7878
      - RADARR_API_KEY=your_api_key
      - RADARR_QUALITY_PROFILE=HD-1080p
      - FLARESOLVERR_URL=http://flaresolverr:8191/v1
    depends_on:
      - flaresolverr
    restart: unless-stopped

  flaresolverr:
    image: ghcr.io/flaresolverr/flaresolverr:latest
    container_name: flaresolverr
    environment:
      - LOG_LEVEL=info
    ports:
      - "8191:8191"
    restart: unless-stopped
```

### Notes

- FlareSolverr uses significant memory as it runs a full browser instance
- When `FLARESOLVERR_URL` is not set, the application uses direct HTTP requests (default behavior)
- The `FLARESOLVERR_SESSION` option can be used to maintain a persistent browser session, which may improve performance for repeated requests

## Development

### Prerequisites

- Node.js 20+
- Yarn package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/ryanpag3/lettarrboxd.git
cd lettarrboxd

# Install dependencies
yarn install

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Run in development mode
yarn start:dev
```

### Development Commands

```bash
yarn start:dev    # Run with auto-reload
yarn tsc          # Compile TypeScript
yarn tsc --noEmit # Type check only
```

### Development Mode

When `NODE_ENV=development`, the application:
- Only processes the first 5 movies (for faster testing)
- Uses more verbose logging
- Includes additional debug information

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

**Movies not being added**
- Verify your Radarr API key and URL are correct
- Check that the quality profile name matches exactly (case-sensitive)
- Ensure your Letterboxd list is public

**Docker container won't start**
- Verify all required environment variables are set
- Check container logs: `docker logs lettarrboxd`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Legal Disclaimer

This project is intended for use with legally sourced media only. It is designed to help users organize and manage their personal media collections. The developers of Lettarrboxd do not condone or support piracy in any form. Users are solely responsible for ensuring their use of this software complies with all applicable laws and regulations in their jurisdiction.
