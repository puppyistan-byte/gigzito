#!/bin/bash
set -e

echo "=== Gigzito Deploy Script ==="
echo "Host: $(hostname)"
echo "Time: $(date)"

cd /opt/gigzito

# Pull latest code from GitHub
echo "--- Pulling latest code ---"
git fetch origin
git reset --hard origin/main

# Detect which server and set the correct DB URL
if [[ "$(hostname)" == *"hil"* ]]; then
  echo "--- Detected: Hillsboro (Oregon) ---"
  export DATABASE_URL="postgresql://gigzito:postgres2626492@localhost:5432/gigzito"
else
  echo "--- Detected: Ashburn (Virginia) ---"
  export DATABASE_URL="postgresql://jovial:Postgres2626492@localhost:5432/gigzito"
fi

# Apply schema changes
echo "--- Pushing schema ---"
DATABASE_URL=$DATABASE_URL npx drizzle-kit push

# Clean rebuild
echo "--- Building ---"
rm -rf dist
npm run build

# Restart app
echo "--- Restarting PM2 ---"
pm2 restart gigzito --update-env

echo "=== Deploy complete ==="
pm2 list
