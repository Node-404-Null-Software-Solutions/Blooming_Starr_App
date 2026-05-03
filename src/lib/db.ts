import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

type GlobalForDb = {
  pgPool?: pg.Pool;
  prisma?: PrismaClient;
};

const globalForDb = globalThis as unknown as GlobalForDb;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const pool =
  globalForDb.pgPool ??
  new pg.Pool({
    connectionString,
    max: 5,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

const adapter = new PrismaPg(pool);

export const db = globalForDb.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForDb.prisma = db;
}
