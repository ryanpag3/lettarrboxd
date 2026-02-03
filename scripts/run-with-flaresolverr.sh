#!/bin/bash
set -e

CONTAINER_NAME="flaresolverr-test"
FLARESOLVERR_IMAGE="ghcr.io/flaresolverr/flaresolverr:latest"

# Default jest arguments if none provided
JEST_ARGS="${@:---testPathPatterns=itest}"

cleanup() {
    echo ""
    echo "Stopping FlareSolverr..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
}

# Ensure cleanup runs on exit (success or failure)
trap cleanup EXIT

# Check if FlareSolverr is already running
if curl -s http://localhost:8191/ 2>/dev/null | grep -q "FlareSolverr is ready"; then
    echo "FlareSolverr is already running, using existing instance..."
    SKIP_CLEANUP=true
    trap - EXIT  # Remove cleanup trap since we didn't start it
else
    echo "Starting FlareSolverr..."
    docker run -d --name $CONTAINER_NAME -p 8191:8191 $FLARESOLVERR_IMAGE

    # Wait for FlareSolverr to be ready
    echo "Waiting for FlareSolverr to be ready..."
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8191/ | grep -q "FlareSolverr is ready"; then
            echo "FlareSolverr is ready!"
            break
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    if [ $attempt -eq $max_attempts ]; then
        echo "FlareSolverr failed to start"
        exit 1
    fi
fi

echo "Running: yarn jest $JEST_ARGS"
yarn jest $JEST_ARGS

echo "Tests completed!"
