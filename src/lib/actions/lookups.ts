"use server";

import { db } from "@/lib/db";
import { requireActiveMembership } from "@/lib/authz";
import { revalidatePath } from "next/cache";

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

export async function getLookupEntries(
  table: string
): Promise<LookupRow[]> {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId || !isValidTable(table)) return [];

  return db.lookupEntry.findMany({
    where: { businessId, table },
    select: { id: true, table: true, name: true, code: true, parentCode: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getLookupEntriesMulti(
  tables: string[]
): Promise<Record<string, LookupRow[]>> {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return {};

  const validTables = tables.filter(isValidTable);
  if (validTables.length === 0) return {};

  const rows = await db.lookupEntry.findMany({
    where: { businessId, table: { in: validTables } },
    select: { id: true, table: true, name: true, code: true, parentCode: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const result: Record<string, LookupRow[]> = {};
  for (const t of validTables) result[t] = [];
  for (const row of rows) result[row.table].push(row);
  return result;
}

export async function createLookupEntry(
  businessSlug: string,
  table: string,
  name: string,
  code: string,
  parentCode?: string | null
) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };
  if (!isValidTable(table)) return { ok: false, error: "Invalid table" };

  const trimName = name.trim();
  const trimCode = code.trim().toUpperCase();
  if (!trimName) return { ok: false, error: "Name is required" };
  if (!trimCode) return { ok: false, error: "Code is required" };

  try {
    await db.lookupEntry.create({
      data: {
        businessId,
        table,
        name: trimName,
        code: trimCode,
        parentCode: parentCode?.trim() || null,
      },
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "Duplicate name or code" };
    }
    throw e;
  }

  revalidatePath(`/app/${businessSlug}/settings/lookups`);
  return { ok: true };
}

export async function updateLookupEntry(
  id: string,
  businessSlug: string,
  data: { name?: string; code?: string; parentCode?: string | null; sortOrder?: number }
) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const existing = await db.lookupEntry.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.code !== undefined) update.code = data.code.trim().toUpperCase();
  if (data.parentCode !== undefined) update.parentCode = data.parentCode?.trim() || null;
  if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder;

  try {
    await db.lookupEntry.update({ where: { id }, data: update });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "Duplicate name or code" };
    }
    throw e;
  }

  revalidatePath(`/app/${businessSlug}/settings/lookups`);
  return { ok: true };
}

export async function deleteLookupEntry(id: string, businessSlug: string) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return { ok: false, error: "No business" };

  const existing = await db.lookupEntry.findFirst({ where: { id, businessId } });
  if (!existing) return { ok: false, error: "Not found" };

  await db.lookupEntry.delete({ where: { id } });

  revalidatePath(`/app/${businessSlug}/settings/lookups`);
  return { ok: true };
}
