

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import lookupData from "./lookup-data.json";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const slugArg = process.argv.find((a) => a.startsWith("--business-slug="));
const slug = slugArg ? slugArg.split("=")[1] : "blooming-starr-nursery";

async function main() {
  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) {
    console.error(`Business with slug "${slug}" not found.`);
    process.exit(1);
  }
  const businessId = business.id;
  console.log(`Seeding lookups for "${business.name}" (${businessId})...\n`);

  const tables = Object.keys(lookupData) as (keyof typeof lookupData)[];
  let totalCreated = 0;

  for (const table of tables) {
    const entries = lookupData[table];
    const data = entries.map((e: { name: string; code: string }, i: number) => ({
      businessId,
      table,
      name: e.name,
      code: e.code,
      sortOrder: i,
    }));

    const result = await prisma.lookupEntry.createMany({
      data,
      skipDuplicates: true,
    });

    console.log(`  ${table}: ${result.count} created (${entries.length} in source)`);
    totalCreated += result.count;
  }

  console.log(`\nDone. ${totalCreated} entries created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
