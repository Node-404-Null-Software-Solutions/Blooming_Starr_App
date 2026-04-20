import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check env vars
  checks.DATABASE_URL = process.env.DATABASE_URL
    ? `SET (${process.env.DATABASE_URL.replace(/\/\/.*:.*@/, "//***:***@")})`
    : "MISSING";
  checks.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ? "SET" : "MISSING";
  checks.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env
    .NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? "SET"
    : "MISSING";
  checks.NODE_ENV = process.env.NODE_ENV ?? "undefined";

  // 2. Test raw pg connection first (no Prisma)
  try {
    const pg = await import("pg");
    const pool = new pg.default.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
    const client = await pool.connect();
    const res = await client.query("SELECT 1 as ok");
    client.release();
    await pool.end();
    checks.pg_direct = `CONNECTED (rows: ${res.rowCount})`;
  } catch (e: unknown) {
    checks.pg_direct = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 3. Test Prisma connection
  try {
    const { db } = await import("@/lib/db");
    const result = await db.$queryRawUnsafe("SELECT 1 as ok");
    checks.prisma = `CONNECTED`;
  } catch (e: unknown) {
    checks.prisma = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
