# Deployment

Written for the current server: Ubuntu, Node 20 via nvm, PM2, nginx,
PostgreSQL — the same host that already runs other projects.

## 0. Reserve a port

The host already uses 3001, 3002 and 3004. This project takes **3003**.

```bash
ss -tlnp | grep -E '300[0-9]'
```

## 1. Database

```bash
sudo -u postgres psql
CREATE DATABASE lebenszeichen;
CREATE USER lebenszeichen WITH ENCRYPTED PASSWORD '<strong password>';
GRANT ALL PRIVILEGES ON DATABASE lebenszeichen TO lebenszeichen;
\c lebenszeichen
GRANT ALL ON SCHEMA public TO lebenszeichen;
\q
```

## 2. Code

```bash
cd /var/www
git clone <repo> lebenszeichen
cd lebenszeichen
npm ci
```

## 3. Environment

```bash
cp .env.example .env
nano .env
```

At minimum:

```bash
DATABASE_URL="postgresql://lebenszeichen:<password>@localhost:5432/lebenszeichen?schema=public"
AUTH_SECRET="<openssl rand -base64 48>"
SITE_URL="https://yourdomain.de"
NEXT_PUBLIC_SITE_URL="https://yourdomain.de"
SITE_NAME="Lebenszeichen"
NEXT_PUBLIC_SITE_NAME="Lebenszeichen"
AI_PROVIDER="fal"
FAL_KEY="<key>"
REVALIDATE_SECRET="<openssl rand -hex 24>"
```

```bash
chmod 600 .env
```

## 4. Schema, seed, build

```bash
npx prisma migrate deploy   # or: npx prisma db push
npm run seed                # first deploy only
npm run build
```

## 5. PM2

`ecosystem.config.js` is in the repository:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup     # run the command it prints, once per server
```

Operations:

```bash
pm2 logs lebenszeichen
pm2 restart lebenszeichen
pm2 status
```

## 5a. Pointing a domain at the deployment

Three things have to line up, in this order.

### 1. DNS (at the registrar)

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` (or `lebenszeichen.online`) | `93.183.80.122` | 300 |
| A | `www` | `93.183.80.122` | 300 |

If the domain was just registered its nameservers may not be delegated yet —
check with `dig +short lebenszeichen.online NS`. An empty answer means the registrar
has not published nameservers, and no A record you add will resolve until it
does. Delegation typically takes minutes to a few hours.

Verify before continuing:

```bash
dig +short lebenszeichen.online A          # must return 93.183.80.122
```

**Do not run certbot before this returns the right address** — it validates over
HTTP and a failed run counts against Let's Encrypt's rate limit (5 failures per
hostname per hour).

### 2. Application

```bash
cd /var/www/lebenszeichen
./scripts/set-domain.sh lebenszeichen.online
```

Rewrites `SITE_URL` and `NEXT_PUBLIC_SITE_URL`, updates `Site.domain`,
regenerates the fallback OG image with the current `SITE_NAME`, rebuilds and
restarts. The rebuild is not optional: `NEXT_PUBLIC_*` values are compiled into
the client bundle.

### 3. nginx + TLS (needs root)

```bash
sudo cp /var/www/lebenszeichen/deploy/nginx-lebenszeichen.conf \
        /etc/nginx/sites-available/lebenszeichen
sudo ln -sf /etc/nginx/sites-available/lebenszeichen /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d lebenszeichen.online -d www.lebenszeichen.online
```

certbot rewrites the site file itself, adding the TLS block and the redirect
from port 80. Renewal is automatic.

### 4. Afterwards

- `https://lebenszeichen.online/` returns 200, `http://` redirects to it
- `https://lebenszeichen.online/sitemap.xml` lists the domain, not the IP
- Submit the domain to Google Search Console ([SEO.md](SEO.md))
- Put the publisher id in `public/ads.txt` before applying to AdSense

## 6. nginx

`/etc/nginx/sites-available/lebenszeichen`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.de www.yourdomain.de;
    return 301 https://yourdomain.de$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.de www.yourdomain.de;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.de/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # One canonical host, so Google never sees two versions of the site.
    if ($host = www.yourdomain.de) { return 301 https://yourdomain.de$request_uri; }

    client_max_body_size 12M;   # must exceed UPLOAD_MAX_MB

    # Immutable build assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /uploads/ {
        alias /var/www/lebenszeichen/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;   # URL import and AI generation are slow
    }
}
```

`X-Forwarded-For` matters — the rate limiter reads it to identify clients.

```bash
sudo ln -s /etc/nginx/sites-available/lebenszeichen /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. TLS

```bash
sudo certbot --nginx -d yourdomain.de -d www.yourdomain.de
```

Renewal is automatic via the certbot timer.

## 8. Subsequent deploys

```bash
cd /var/www/lebenszeichen && ./deploy.sh
```

which does: pull → `npm ci` → `prisma migrate deploy` → `npm run build` →
`pm2 restart`.

Remember: any `NEXT_PUBLIC_*` change needs a **rebuild**, not just a restart.

## 9. Scheduled publishing (optional)

Scheduled posts appear on their own — the public query filters on
`publishedAt <= now()`. The cron only makes the stored status match:

```bash
crontab -e
*/5 * * * * curl -s -X POST -H "x-revalidate-secret: <REVALIDATE_SECRET>" https://yourdomain.de/api/revalidate > /dev/null
```

## 10. Backups

```bash
# /home/<user>/backup-lebenszeichen.sh
#!/bin/bash
set -e
STAMP=$(date +%F)
DIR=/home/<user>/db-backups
mkdir -p "$DIR"
pg_dump -Fc lebenszeichen > "$DIR/lebenszeichen-$STAMP.dump"
tar czf "$DIR/uploads-$STAMP.tar.gz" -C /var/www/lebenszeichen/public uploads
find "$DIR" -name 'lebenszeichen-*.dump' -mtime +14 -delete
find "$DIR" -name 'uploads-*.tar.gz'     -mtime +14 -delete
```

```bash
chmod +x ~/backup-lebenszeichen.sh
crontab -e
0 3 * * * /home/<user>/backup-lebenszeichen.sh
```

Back up both. The database references files that exist only on disk.

## 11. Health check

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.de/
curl -s https://yourdomain.de/robots.txt
curl -s https://yourdomain.de/sitemap.xml | head -5
curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.de/admin   # expect 307
pm2 status
```

## 12. Content Security Policy — later

No CSP ships today, on purpose: AdSense needs a broad `script-src` and injects
inline styles, so a policy written before the ad stack is final would either
break ads or mean nothing. Once ads are settled, start here and test in
`Content-Security-Policy-Report-Only` for a week:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://www.googletagmanager.com https://fundingchoicesmessages.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://*.googlesyndication.com https://*.doubleclick.net https://www.youtube-nocookie.com; connect-src 'self' https://*.google-analytics.com https://*.googlesyndication.com;" always;
```

## 13. Troubleshooting

| Symptom | Cause |
|---|---|
| 502 from nginx | App not running — `pm2 logs lebenszeichen` |
| Ads invisible in production | `ADS_ENABLED`, the CMS toggle, `ca-pub-…` and a slot id must **all** be set, and `NEXT_PUBLIC_*` needs a rebuild |
| "AUTH_SECRET is not configured" | Missing or under 32 characters |
| Uploads fail at ~1 MB | `client_max_body_size` in nginx is below `UPLOAD_MAX_MB` |
| Import always times out | Outbound HTTPS blocked by the firewall |
| Admin loops back to login | Cookie `Secure` in production without HTTPS, or the system clock is wrong |
| Rate limiting hits everyone at once | `X-Forwarded-For` not passed by nginx |
