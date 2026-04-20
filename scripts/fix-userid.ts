import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const BAD  = "user_38B3j5RPhyTSDhAFIqBOiXYfg9H ";   // with trailing space
const GOOD = "user_38B3j5RPhyTSDhAFIqBOiXYfg9H";     // clean

async function main() {
  await db.$transaction(async (tx) => {
    const p = await tx.profile.updateMany({
      where: { userId: BAD },
      data:  { userId: GOOD },
    });
    console.log(`Profiles updated: ${p.count}`);

    const m = await tx.membership.updateMany({
      where: { userId: BAD },
      data:  { userId: GOOD },
    });
    console.log(`Memberships updated: ${m.count}`);

    const b = await tx.business.updateMany({
      where: { ownerId: BAD },
      data:  { ownerId: GOOD },
    });
    console.log(`Businesses updated: ${b.count}`);
  });

  console.log("\nDone — userId trailing space removed.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
