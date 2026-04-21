#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Gigzito — VPS Deploy Script
# Usage: bash scripts/deploy.sh
# Requires: SSHPASS env var (VPS_SSH_PASSWORD) and sshpass binary
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

VPS="root@5.78.128.185"
VPS_DIR="/opt/gigzito"
TAR="/tmp/gz-full.tar.gz"
SSHPASS_BIN="/nix/store/icr3kfxrz4fbvksbd2dg7i5mqkb5x5hl-sshpass-1.10/bin/sshpass"

# sshpass -e reads from $SSHPASS — map from Replit secret name
export SSHPASS="$VPS_SSH_PASSWORD"

SSH="$SSHPASS_BIN -e ssh -o StrictHostKeyChecking=no $VPS"
SCP="$SSHPASS_BIN -e scp -o StrictHostKeyChecking=no"

# Required asset filenames (without hashes — matched by prefix)
REQUIRED_ASSETS=(
  "geezee_button_circle"
  "gzbusiness_button_circle"
  "gzflash_button_circle"
  "gzgroups_button_circle"
  "gzmusic_button_circle"
  "mostloved_button_circle"
  "index-"
  "index-"   # JS and CSS both start with index-
)

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║          Gigzito VPS Deploy Script           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── STEP 1: Build ─────────────────────────────────────────────────────────────
echo "▶ [1/5] Building..."
npm run build
echo "  ✓ Build complete"

# ── STEP 2: Verify local assets ───────────────────────────────────────────────
echo ""
echo "▶ [2/5] Verifying local build assets..."

LOCAL_ASSETS=$(ls dist/public/assets/)
LOCAL_COUNT=$(ls dist/public/assets/ | wc -l | tr -d ' ')
echo "  Found $LOCAL_COUNT local asset files:"
ls dist/public/assets/ | sed 's/^/    - /'

MISSING=0
for asset in geezee_button_circle gzbusiness_button_circle gzflash_button_circle \
             gzgroups_button_circle gzmusic_button_circle mostloved_button_circle; do
  if ! echo "$LOCAL_ASSETS" | grep -q "$asset"; then
    echo "  ✗ MISSING: $asset"
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "  ✗ ABORT: Required assets are missing from build. Do not deploy."
  exit 1
fi
echo "  ✓ All required assets present"

# ── STEP 3: Package ───────────────────────────────────────────────────────────
echo ""
echo "▶ [3/5] Packaging..."
rm -f "$TAR"
tar -czf "$TAR" dist/public/ dist/index.cjs
SIZE=$(ls -lh "$TAR" | awk '{print $5}')
echo "  ✓ Package created: $TAR ($SIZE)"

# ── STEP 4: Upload ────────────────────────────────────────────────────────────
echo ""
echo "▶ [4/5] Uploading to VPS..."
$SCP "$TAR" "$VPS:/tmp/gz-full.tar.gz"
echo "  ✓ Upload complete"

# ── STEP 5: Deploy on VPS ─────────────────────────────────────────────────────
echo ""
echo "▶ [5/5] Deploying on VPS..."
$SSH bash -s << 'REMOTE'
  set -euo pipefail
  VPS_DIR="/opt/gigzito"

  echo "  → Wiping old assets..."
  rm -rf "$VPS_DIR/dist/public/assets"
  mkdir -p "$VPS_DIR/dist/public/assets"

  echo "  → Extracting new build..."
  tar -xzf /tmp/gz-full.tar.gz -C "$VPS_DIR/"

  echo "  → Verifying VPS assets..."
  VPS_COUNT=$(ls "$VPS_DIR/dist/public/assets/" | wc -l | tr -d ' ')
  VPS_ASSETS=$(ls "$VPS_DIR/dist/public/assets/")
  echo "  Found $VPS_COUNT files on VPS:"
  ls "$VPS_DIR/dist/public/assets/" | sed 's/^/    - /'

  MISSING=0
  for asset in geezee_button_circle gzbusiness_button_circle gzflash_button_circle \
               gzgroups_button_circle gzmusic_button_circle mostloved_button_circle; do
    if ! echo "$VPS_ASSETS" | grep -q "$asset"; then
      echo "  ✗ MISSING on VPS: $asset"
      MISSING=1
    fi
  done

  if [ $MISSING -eq 1 ]; then
    echo ""
    echo "  ✗ ABORT: Assets missing on VPS after extraction. NOT restarting server."
    exit 1
  fi
  echo "  ✓ All assets verified on VPS"

  echo "  → Restarting server..."
  pm2 restart gigzito
  echo "  ✓ Server restarted"
REMOTE

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║          ✓ DEPLOY COMPLETE                   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  → Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)"
echo "     to clear any cached old bundles."
echo ""
