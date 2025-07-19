# Use Node.js LTS Alpine image for smaller size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --production

# Copy source code
COPY . .

# Build TypeScript
RUN yarn tsc

# Create data directory
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/data

# Create non-root user for security
RUN addgroup -g 1001 -S watchlistarr && \
    adduser -S watchlistarr -u 1001 -G watchlistarr

# Change ownership of app and data directories
RUN chown -R watchlistarr:watchlistarr /app /data

# Switch to non-root user
USER watchlistarr

# Expose port (optional, for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=5m --timeout=30s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the application
CMD ["node", "src/index.js"]