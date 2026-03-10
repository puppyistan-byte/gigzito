#!/bin/bash
# Gigzito Fresh VPS Setup Script
# Run as root on a fresh Ubuntu 22.04 / Debian 12 server:
#   bash vps_setup.sh

set -e

echo "=== Gigzito VPS Setup ==="

# 1. System updates & deps
apt-get update -y
apt-get install -y curl git build-essential postgresql postgresql-contrib

# 2. Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. pm2
npm install -g pm2

# 4. Clone repo
mkdir -p /opt
cd /opt
rm -rf gigzito
git clone https://github.com/puppyistan-byte/gigzito.git gigzito
cd /opt/gigzito

# 5. Install dependencies
npm install

# 6. PostgreSQL: create user + database
sudo -u postgres psql -c "CREATE USER gigzito WITH PASSWORD 'CHANGE_ME_DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE gigzito OWNER gigzito;" 2>/dev/null || true

# 7. Create .env  ← FILL THESE IN before running
cat > /opt/gigzito/.env << 'ENVEOF'
DATABASE_URL=postgresql://gigzito:CHANGE_ME_DB_PASS@localhost:5432/gigzito
SESSION_SECRET=CHANGE_ME_SESSION_SECRET
NODE_ENV=production
PORT=5000
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@gigzito.com
ENVEOF

echo ""
echo ">>> EDIT /opt/gigzito/.env before continuing <<<"
echo "    Change CHANGE_ME_DB_PASS and CHANGE_ME_SESSION_SECRET"
echo ""
read -p "Press ENTER when .env is ready..."

# 8. Push DB schema
cd /opt/gigzito
npm run db:push

# 9. Start with pm2
pm2 delete gigzito 2>/dev/null || true
pm2 start npm --name gigzito -- run dev
pm2 save
pm2 startup | tail -1 | bash

echo ""
echo "=== Done! ==="
echo "Gigzito is running on port 5000"
echo "Check logs: pm2 logs gigzito"
echo ""
echo "To update in future: cd /opt/gigzito && git pull && pm2 restart gigzito"
