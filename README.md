# Blooming Starr

Inventory, scheduling, sales, expenses, and plant operations tracking for Blooming Starr.

## Local Development

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Stack

- Next.js standalone server
- Prisma with Supabase Postgres
- Clerk authentication
- Caddy reverse proxy
- systemd process service
- Persistent local upload directory for logos

## Environment

Create `.env` locally or `/etc/blooming-starr.env` on the VPS.

```env
DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_live_your_clerk_secret_key
NEXT_PUBLIC_APP_URL=https://yourdomain.com
UPLOADS_DIR=/var/www/blooming-starr/uploads
UPLOADS_PUBLIC_PATH=/uploads
```

## Build

```bash
npm ci
npm run db:migrate
npm run build
```

## Run

Full project checkout:

```bash
npm run start
```

Standalone production server:

```bash
npm run start:standalone
```

## Namecheap VPS

Use Ubuntu with Node.js LTS, Caddy, and systemd. Example templates are in:

- [`deploy/Caddyfile.example`](deploy/Caddyfile.example)
- [`deploy/blooming-starr.service.example`](deploy/blooming-starr.service.example)

Recommended server paths:

```text
/var/www/blooming-starr/app/current
/var/www/blooming-starr/uploads
/etc/blooming-starr.env
```

After copying the service file to `/etc/systemd/system/blooming-starr.service`:

```bash
sudo systemctl daemon-reload
sudo systemctl enable blooming-starr
sudo systemctl restart blooming-starr
```

Health check:

```text
https://yourdomain.com/api/health
```
