# Supabase setup

This app uses **Supabase** for the PostgreSQL database. Auth is handled by **Clerk** (not Supabase Auth).

## Where to put the API key / database URL

1. **Create a local env file** in the project root (same folder as `package.json`):
   - **`.env`** or **`.env.local`**
   - This file is git-ignored; do not commit it.

2. **Add your Supabase database URL** as `DATABASE_URL`:
   - Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
   - Go to **Settings** (gear) → **Database**.
   - Under **Connection string**, choose **URI**.
   - Pick the **Transaction** pooler (port **6543**) for serverless/Next.js, or **Session** (port 5432) for direct connections.
   - Copy the URI and replace `[YOUR-PASSWORD]` with your database password.
   - Paste into your `.env` / `.env.local`:
     ```env
     DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
     ```

3. **Run migrations** (first time or after schema changes):
   ```bash
   npx prisma migrate deploy
   ```
   Or for local development with the migration tool:
   ```bash
   npx prisma migrate dev
   ```

That’s all you need for the app. If you add Supabase client features later (e.g. Storage or Realtime), you’d add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the same `.env` / `.env.local` file.
