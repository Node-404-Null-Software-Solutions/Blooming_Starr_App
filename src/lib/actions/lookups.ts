"use server";

import { requireBusinessMembership } from "@/lib/authz";
import { createLookupEntryRepository } from "@/lib/repositories/lookup-entry";

export type LookupRow = {
  id: string;
  table: string;
  name: string;
  code: string;
  parentCode: string | null;
  sortOrder: number;
};

const VALID_TABLES = [
  "plantSource",
  "genus",
  "cultivar",
  "plantId",
  "paymentMethod",
  "productSource",
  "productCategory",
  "productSize",
  "productStyle",
  "origin",
  "status",
  "environment",
  "salesChannel",
  "transplantAction",
  "transplantMedia",
  "potSize",
  "potColor",
  "expenseCategory",
  "expenseVendor",
  "fertilizerProduct",
  "treatmentProduct",
] as const;

export type LookupTable = (typeof VALID_TABLES)[number];

function isValidTable(t: string): t is LookupTable {
  return (VALID_TABLES as readonly string[]).includes(t);
}

export async function getLookupEntriesMulti(
  businessSlug: string,
  tables: string[]
): Promise<Record<string, LookupRow[]>> {
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const lookupEntries = createLookupEntryRepository(businessContext);

  const validTables = tables.filter(isValidTable);
  if (validTables.length === 0) return {};

  const rows = await lookupEntries.list({ table: { in: validTables } });

  const result: Record<string, LookupRow[]> = {};
  for (const t of validTables) result[t] = [];
  for (const row of rows) result[row.table].push(row);
  return result;
}
