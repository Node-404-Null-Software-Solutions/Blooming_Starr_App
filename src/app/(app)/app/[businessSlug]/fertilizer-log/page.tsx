import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { sortByDateDescNullsLast } from "@/lib/sort";
import FertilizerLogClient from "./FertilizerLogClient";

export default async function FertilizerLogPage({
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
  const plantSkuRaw = typeof sp.plantSku === "string" ? sp.plantSku.trim() : "";
  const potSkuRaw = typeof sp.potSku === "string" ? sp.potSku.trim() : "";
  const productRaw = typeof sp.product === "string" ? sp.product.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo ? { gte: validFrom ?? undefined, lte: validTo ?? undefined } : undefined;

  const rows = await db.fertilizerLog.findMany({
    where: {
      businessId,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(plantSkuRaw ? { plantSku: { contains: plantSkuRaw, mode: "insensitive" as const } } : {}),
      ...(potSkuRaw ? { potSku: { contains: potSkuRaw, mode: "insensitive" as const } } : {}),
      ...(productRaw ? { product: { contains: productRaw, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const sortedRows = sortByDateDescNullsLast(rows);

  const hasRows = sortedRows.length > 0;
  type Row = (typeof rows)[number];
  const serialized = sortedRows.map((row: Row) => ({
    id: row.id,
    date: row.date ? row.date.toISOString() : null,
    plantSku: row.plantSku,
    potSku: row.potSku,
    product: row.product,
    method: row.method,
    rate: row.rate,
    unit: row.unit,
    notes: row.notes,
    nextEarliest: row.nextEarliest ? row.nextEarliest.toISOString() : null,
    nextLatest: row.nextLatest ? row.nextLatest.toISOString() : null,
  }));

  return (
    <FertilizerLogClient
      businessSlug={businessSlug}
      rows={serialized}
      hasRows={hasRows}
    />
  );
}
