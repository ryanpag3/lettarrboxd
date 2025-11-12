# Lettarrboxd

Automatically sync your Letterboxd lists to Radarr for seamless movie management.

## Overview

Lettarrboxd is an application that monitors your Letterboxd lists (watchlists, regular lists, watched movies, filmographies, collections, etc.) and automatically pushes new movies to Radarr. It runs continuously, checking for updates at configurable intervals and only processing new additions to avoid duplicate API calls.

## Supported Letterboxd URLs

The application supports various types of Letterboxd URLs for the `LETTERBOXD_URL` environment variable:

### Currently Supported
- **Watchlists**: `https://letterboxd.com/username/watchlist/`
- **Regular Lists**: `https://letterboxd.com/username/list/list-name/`
- **Actor Filmography**: `https://letterboxd.com/actor/actor-name/`
- **Director Filmography**: `https://letterboxd.com/director/director-name/`
- **Writer Filmography**: `https://letterboxd.com/writer/writer-name/`

### Planned Support (Coming Soon)
- **Watched Movies**: `https://letterboxd.com/username/films/`
- **Collections**: `https://letterboxd.com/films/in/collection-name/`
- **Popular Movies**: `https://letterboxd.com/films/popular/`

### Examples
```bash
# User's watchlist
LETTERBOXD_URL=https://letterboxd.com/moviefan123/watchlist/

# User's custom list
LETTERBOXD_URL=https://letterboxd.com/dave/list/official-top-250-narrative-feature-films/

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
