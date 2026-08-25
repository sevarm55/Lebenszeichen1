#!/bin/bash
#
# Deploy Lebenszeichen on the production server.
# Run from /var/www/lebenszeichen.
#
set -euo pipefail

APP_NAME="lebenszeichen"
APP_DIR="/var/www/lebenszeichen"

cd "$APP_DIR"

# nvm is not loaded in a non-interactive shell
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "▸ 1/5 Pulling latest code"
git pull origin main

echo "▸ 2/5 Installing dependencies"
npm ci

echo "▸ 3/5 Applying database schema"
if [ -d "database/migrations" ]; then
  npx prisma migrate deploy
else
  npx prisma db push --skip-generate
fi

echo "▸ 4/5 Building"
# NEXT_PUBLIC_* values are inlined here, so an env change needs this step.
npm run build

echo "▸ 5/5 Restarting"
pm2 restart "$APP_NAME" --update-env || pm2 start ecosystem.config.js
pm2 save

echo
echo "✓ Deploy complete"
pm2 status "$APP_NAME"
