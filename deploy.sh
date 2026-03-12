#!/bin/bash

set -e

echo "Starting Gigzito deploy..."

cd /opt/gigzito

echo "Pulling latest code..."
git pull

echo "Installing dependencies..."
npm install

echo "Restarting Gigzito app..."
pm2 restart gigzito

echo "Restarting Telegram bot..."
pm2 restart gigzito-bot

echo "Deploy complete."
