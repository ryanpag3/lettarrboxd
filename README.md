# Watchlistarr

Automatically sync your Letterboxd watchlist to Radarr for seamless movie management.

## Overview

Watchlistarr is an application that monitors your Letterboxd watchlist and automatically pushes new movies to Radarr. It runs continuously, checking for updates at configurable intervals and only processing new additions to avoid duplicate API calls.

## Quick Start

### Docker

```bash
docker run -d \
  --name watchlistarr \
  -e LETTERBOXD_USERNAME=your_username \
  -e RADARR_API_URL=http://your-radarr:7878 \
  -e RADARR_API_KEY=your_api_key \
  -e RADARR_QUALITY_PROFILE="HD-1080p" \
  ryanpage/watchlistarr:latest
```

### Docker Compose

```yaml
services:
  watchlistarr:
    image: ryanpage/watchlistarr:latest
    container_name: watchlistarr
    environment:
      - LETTERBOXD_USERNAME=your_username
      - RADARR_API_URL=http://radarr:7878
      - RADARR_API_KEY=your_api_key
      - RADARR_QUALITY_PROFILE=HD-1080p
      - CHECK_INTERVAL_MINUTES=60
    restart: unless-stopped
```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `LETTERBOXD_USERNAME` | Your Letterboxd username | `moviefan123` |
| `RADARR_API_URL` | Radarr base URL | `http://radarr:7878` |
| `RADARR_API_KEY` | Radarr API key | `abc123...` |
| `RADARR_QUALITY_PROFILE` | Quality profile name in Radarr | `HD-1080p` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHECK_INTERVAL_MINUTES` | `10` | How often to check for new movies (minimum 10) |
| `RADARR_MINIMUM_AVAILABILITY` | `released` | When movie becomes available (`announced`, `inCinemas`, `released`) |
| `LETTERBOXD_TAKE_AMOUNT` | - | Number of movies to sync (requires `LETTERBOXD_TAKE_STRATEGY`) |
| `LETTERBOXD_TAKE_STRATEGY` | - | Movie selection strategy: `newest` or `oldest` (requires `LETTERBOXD_TAKE_AMOUNT`) |
| `DATA_DIR` | `/data` | Directory for storing application data. You generally do not need to worry about this. |

## Development

### Prerequisites

- Node.js 20+
- Yarn package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/ryanpag3/watchlistarr.git
cd watchlistarr

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
yarn start:dev     # Run with auto-reload
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
- Ensure your Letterboxd profile is public

**Docker container won't start**
- Verify all required environment variables are set
- Check container logs: `docker logs watchlistarr`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.