#!/bin/bash
# ============================================================
# Gigzito — Nginx Reverse Proxy + HTTPS (Let's Encrypt) Setup
# Run this on your Hetzner VPS as root
# USAGE: bash nginx_setup.sh yourdomain.com
# ============================================================

set -e

DOMAIN="${1}"
EMAIL="${2:-admin@${DOMAIN}}"
APP_PORT=5000

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash nginx_setup.sh yourdomain.com [admin@yourdomain.com]"
  exit 1
fi

echo ">>> Installing Nginx and Certbot..."
apt-get update -q
apt-get install -y nginx certbot python3-certbot-nginx

echo ">>> Writing Nginx config for $DOMAIN..."
cat > /etc/nginx/sites-available/gigzito << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # --- SSL (Certbot will fill these in) ---
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # --- Security headers ---
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options    nosniff always;
    add_header X-Frame-Options           SAMEORIGIN always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;

    client_max_body_size 50M;

    # --- Proxy to Node.js app ---
    location / {
        proxy_pass         http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/gigzito /etc/nginx/sites-enabled/gigzito
rm -f /etc/nginx/sites-enabled/default

echo ">>> Testing Nginx config..."
nginx -t

echo ">>> Starting Nginx..."
systemctl enable nginx
systemctl reload nginx

echo ">>> Obtaining SSL certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL" \
  --redirect

echo ">>> Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "============================================================"
echo " Done! Your site is now live at https://$DOMAIN"
echo " Certbot will auto-renew your certificate every 60 days."
echo "============================================================"
