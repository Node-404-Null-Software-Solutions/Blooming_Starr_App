import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { sortByDateDescNullsLast } from "@/lib/sort";
import TreatmentTrackingClient from "./TreatmentTrackingClient";

export default async function TreatmentTrackingPage({
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
  const skuRaw = typeof sp.sku === "string" ? sp.sku.trim() : "";
  const targetRaw = typeof sp.target === "string" ? sp.target.trim() : "";
  const productRaw = typeof sp.product === "string" ? sp.product.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo ? { gte: validFrom ?? undefined, lte: validTo ?? undefined } : undefined;

  const rows = await db.treatmentTracking.findMany({
    where: {
      businessId,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(skuRaw ? { sku: { contains: skuRaw, mode: "insensitive" as const } } : {}),
      ...(targetRaw ? { target: { contains: targetRaw, mode: "insensitive" as const } } : {}),
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
    sku: row.sku,
    target: row.target,
    product: row.product,
    activeIngredient: row.activeIngredient,
    epaNumber: row.epaNumber,
    rate: row.rate,
    potSize: row.potSize,
    method: row.method,
    initials: row.initials,
    nextEarliest: row.nextEarliest ? row.nextEarliest.toISOString() : null,
    nextLatest: row.nextLatest ? row.nextLatest.toISOString() : null,
  }));

  return (
    <TreatmentTrackingClient
      businessSlug={businessSlug}
      rows={serialized}
      hasRows={hasRows}
    />
  );
}
