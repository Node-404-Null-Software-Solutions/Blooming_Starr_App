This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Geist, a modern font family.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Web app & VPS deployment

This app runs as a web-only Next.js application. Use Supabase as the PostgreSQL database and deploy on a VPS.

**Local development:** `npm run dev`

**Production build and run:**

```bash
npm run build
npm run start
```

**Environment variables:** Set in `.env` or your host environment:

- `DATABASE_URL` — Supabase Postgres connection string (use the Transaction pooler, port 6543; see Supabase Dashboard → Settings → Database).
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — from [Clerk](https://dashboard.clerk.com).
- `NEXT_PUBLIC_APP_URL` — your app URL (e.g. `https://yourdomain.com` or `http://localhost:3000`).

**On a VPS:** Install Node (LTS), clone the repo, run `npm ci`, `npm run db:generate` (and `npm run db:migrate` if you use migrations). Set the env vars above, then `npm run build` and `npm run start`. Use a process manager (e.g. systemd or PM2) and a reverse proxy (e.g. Nginx or Caddy) in front, and set `NEXT_PUBLIC_APP_URL` to your public URL.

### Supabase database sync (match this version)

To bring your Supabase database in line with the current app schema:

1. Set `DATABASE_URL` in `.env` to your Supabase Postgres connection string (Supabase Dashboard → Settings → Database → Connection string; use the **Transaction** pooler, port 6543).
2. Run:
   ```bash
   npm run db:migrate
   ```
   This applies all pending Prisma migrations. If the database is empty, every migration runs and you get the full schema. If it is outdated, only missing migrations run.

**Reset and reapply (destructive):** If you need to wipe the DB and start from the current schema, in Supabase SQL Editor run:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```
   Then run `npm run db:migrate` again so all migrations apply from scratch.

A full schema SQL file is also in `prisma/supabase_schema.sql` (for reference or for running manually in Supabase SQL Editor on an empty project).
