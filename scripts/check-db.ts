import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const profiles = await db.profile.findMany();
  console.log("\n=== PROFILES ===");
  console.log(JSON.stringify(profiles, null, 2));

  const memberships = await db.membership.findMany();
  console.log("\n=== MEMBERSHIPS ===");
  console.log(JSON.stringify(memberships, null, 2));

  const business = await db.business.findFirst({
    where: { slug: "blooming-starr-nursery" },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
  console.log("\n=== BUSINESS ===");
  console.log(JSON.stringify(business, null, 2));
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
