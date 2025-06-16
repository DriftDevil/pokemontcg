#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Fetching latest changes from Git repository..."
git fetch

echo "Pulling latest changes..."
git pull

echo "Rebuilding and restarting Docker containers..."
docker compose up -d --build

echo "Update and redeploy process completed successfully!"
