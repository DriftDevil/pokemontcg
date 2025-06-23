#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Syncing with Git repository..."

echo "Fetching latest changes from remote..."
git fetch

echo "Pulling latest changes into local branch (e.g., merging origin/main into main)..."
git pull

echo "Pushing local branch (with any new local commits) to remote..."
git push # This will push the current branch to its configured upstream.

echo "Rebuilding and restarting Docker containers..."
docker compose up -d --build

echo "Git sync, rebuild, and redeploy process completed successfully!"
