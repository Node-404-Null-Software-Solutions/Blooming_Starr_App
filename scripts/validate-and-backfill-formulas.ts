/**
 * Check if existing Sales data follows the app formulas,
 * and optionally backfill so every row matches.
 *
 * Run: npx tsx scripts/validate-and-backfill-formulas.ts [--fix]
 * (Install tsx if needed: npm i -D tsx)
 *
 * Requires DATABASE_URL (e.g. in .env).
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeSalesDerived } from "../src/lib/formulas";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Set it in .env or the environment.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const doFix = process.argv.includes("--fix");

function eq(a: number, b: number, tolerance = 0): boolean {
  if (tolerance === 0) return a === b;
  return Math.abs(a - b) <= tolerance;
}

async function main() {
  console.log("Checking SalesEntry against app formulas...\n");

  const salesRows = await prisma.salesEntry.findMany({
    select: {
      id: true,
      qty: true,
      salePriceCents: true,
      costCents: true,
      totalSaleCents: true,
      profitCents: true,
      marginPct: true,
    },
  });

  let salesOk = 0;
  let salesBad = 0;
  const salesIdsToFix: string[] = [];

  for (const row of salesRows) {
    const derived = computeSalesDerived(
      row.qty,
      row.salePriceCents,
      row.costCents
    );
    const totalMatch = eq(row.totalSaleCents, derived.totalSaleCents);
    const profitMatch = eq(row.profitCents, derived.profitCents);
    const marginMatch = eq(row.marginPct ?? 0, derived.marginPct, 0.01);
    if (totalMatch && profitMatch && marginMatch) {
      salesOk++;
    } else {
      salesBad++;
      if (doFix) salesIdsToFix.push(row.id);
    }
  }

  console.log("SalesEntry:");
  console.log(`  OK (match formula): ${salesOk}`);
  console.log(`  Mismatch:            ${salesBad}`);

  if (doFix && salesIdsToFix.length > 0) {
    console.log("\nBackfilling mismatched rows...");

    for (const id of salesIdsToFix) {
      const row = await prisma.salesEntry.findUniqueOrThrow({
        where: { id },
        select: { qty: true, salePriceCents: true, costCents: true },
      });
      const derived = computeSalesDerived(
        row.qty,
        row.salePriceCents,
        row.costCents
      );
      await prisma.salesEntry.update({
        where: { id },
        data: {
          totalSaleCents: derived.totalSaleCents,
          profitCents: derived.profitCents,
          marginPct: derived.marginPct,
        },
      });
    }
    console.log(`  Updated ${salesIdsToFix.length} SalesEntry rows.`);
    console.log("Done.");
  } else if (salesBad > 0) {
    console.log("\nTo recompute and save these rows, run with --fix");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
