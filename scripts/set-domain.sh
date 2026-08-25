#!/bin/bash
#
# Point the deployment at a domain.
#
#   ./scripts/set-domain.sh lebenszeichen.io
#
# Updates .env, the Site row, rebuilds (NEXT_PUBLIC_* are inlined at build time,
# so a restart alone is not enough) and restarts PM2.
#
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>   e.g. $0 lebenszeichen.io" >&2
  exit 1
fi

APP_DIR="/var/www/lebenszeichen"
cd "$APP_DIR"

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

URL="https://${DOMAIN}"

echo "▸ Updating .env"
# Rewrite in place, preserving every other line and never echoing secrets.
python3 - "$URL" "$DOMAIN" <<'PY'
import re, sys
url, domain = sys.argv[1], sys.argv[2]
with open('.env', encoding='utf-8') as f:
    env = f.read()
for key, value in (
    ('SITE_URL', url),
    ('NEXT_PUBLIC_SITE_URL', url),
):
    if re.search(rf'^{key}=', env, flags=re.M):
        env = re.sub(rf'^{key}=.*$', f'{key}="{value}"', env, flags=re.M)
    else:
        env += f'\n{key}="{value}"'
with open('.env', 'w', encoding='utf-8') as f:
    f.write(env)
print(f'  SITE_URL / NEXT_PUBLIC_SITE_URL -> {url}')
PY

echo "▸ Updating the Site row"
npx tsx --env-file=.env -e "
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const domain = process.argv[1]
await prisma.site.updateMany({ where: { key: 'de' }, data: { domain } })
console.log('  Site.domain ->', domain)
await prisma.\$disconnect()
" "$DOMAIN"

echo "▸ Regenerating the fallback OG image"
npx tsx --env-file=.env scripts/make-og-default.ts

echo "▸ Building"
npm run build

echo "▸ Restarting"
pm2 restart lebenszeichen --update-env
pm2 save

echo
echo "✓ Done. Public base URL is now ${URL}"
echo
echo "Still required, and they need root:"
echo "  sudo cp ${APP_DIR}/deploy/nginx-lebenszeichen.conf /etc/nginx/sites-available/lebenszeichen"
echo "  sudo ln -sf /etc/nginx/sites-available/lebenszeichen /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
