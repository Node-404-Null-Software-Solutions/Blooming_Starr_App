

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const userId = process.env.CLERK_USER_ID?.trim();
if (!userId) {
  console.error("Error: Set CLERK_USER_ID environment variable.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const business = await db.business.findFirst({
    where: { slug: "blooming-starr-nursery" },
  });

  if (!business) {
    console.error('No business with slug "blooming-starr-nursery" found.');
    process.exit(1);
  }

  console.log(`Found business: "${business.name}" (${business.id})`);

  await db.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: business.id },
      data: { ownerId: userId },
    });
    console.log(`Updated business ownerId to ${userId}`);

    await tx.profile.upsert({
      where: { userId },
      update: { activeBusinessId: business.id },
      create: { userId, activeBusinessId: business.id },
    });
    console.log(`Upserted profile for ${userId}`);

    const existing = await tx.membership.findFirst({
      where: { businessId: business.id, userId },
    });
    if (existing) {
      await tx.membership.update({
        where: { id: existing.id },
        data: { role: "OWNER", status: "ACTIVE" },
      });
      console.log(`Updated existing membership to OWNER`);
    } else {
      await tx.membership.create({
        data: {
          businessId: business.id,
          userId,
          role: "OWNER",
          status: "ACTIVE",
        },
      });
      console.log(`Created OWNER membership`);
    }
  });

  console.log("\nDone! The business is now linked to the Clerk user.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
