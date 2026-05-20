# Supabase

This app uses Supabase Postgres for data storage. Authentication is handled by Clerk.

## Database URL

Set `DATABASE_URL` in `.env` for local development or `/etc/blooming-starr.env` on the VPS.

```env
DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
```

Use the Supabase transaction pooler on port `6543` for this app.

## Migrations

```bash
npm run db:migrate
```

For local Prisma development:

```bash
npx prisma migrate dev
```

The reference schema is available at [`prisma/supabase_schema.sql`](prisma/supabase_schema.sql).
