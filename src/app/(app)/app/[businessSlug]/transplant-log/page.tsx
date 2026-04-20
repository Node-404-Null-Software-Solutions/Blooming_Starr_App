import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { sortByDateDescNullsLast } from "@/lib/sort";
import TransplantLogClient from "./TransplantLogClient";

export default async function TransplantLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireActiveMembership();
  const { businessSlug } = await params;
  const businessId = profile.activeBusinessId;
  const sp = (await searchParams) ?? {};

  if (!businessId) {
    return null;
  }

  const fromRaw = typeof sp.from === "string" ? sp.from : "";
  const toRaw = typeof sp.to === "string" ? sp.to : "";
  const originalSkuRaw = typeof sp.originalSku === "string" ? sp.originalSku.trim() : "";
  const actionRaw = typeof sp.action === "string" ? sp.action.trim() : "";
  const fromPotRaw = typeof sp.fromPot === "string" ? sp.fromPot.trim() : "";
  const toPotRaw = typeof sp.toPot === "string" ? sp.toPot.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo ? { gte: validFrom ?? undefined, lte: validTo ?? undefined } : undefined;

  const rows = await db.transplantLog.findMany({
    where: {
      businessId,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(originalSkuRaw ? { originalSku: { contains: originalSkuRaw, mode: "insensitive" as const } } : {}),
      ...(actionRaw ? { action: { contains: actionRaw, mode: "insensitive" as const } } : {}),
      ...(fromPotRaw ? { fromPot: { contains: fromPotRaw, mode: "insensitive" as const } } : {}),
      ...(toPotRaw ? { toPot: { contains: toPotRaw, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const sortedRows = sortByDateDescNullsLast(rows);

  const hasRows = sortedRows.length > 0;
  type Row = (typeof rows)[number];
  const serialized = sortedRows.map((row: Row) => ({
    id: row.id,
    date: row.date ? row.date.toISOString() : null,
    originalSku: row.originalSku,
    action: row.action,
    media: row.media,
    fromPot: row.fromPot,
    toPot: row.toPot,
    idCode: row.idCode,
    divisionSku: row.divisionSku,
    costCents: row.costCents,
    potColor: row.potColor,
    notes: row.notes,
  }));

  return (
    <TransplantLogClient
      businessSlug={businessSlug}
      rows={serialized}
      hasRows={hasRows}
    />
  );
}
