import { requireBusinessMembership } from "@/lib/authz";
import { createFertilizerLogRepository } from "@/lib/repositories/fertilizer-log";
import { sortByDateDescNullsLast } from "@/lib/sort";
import FertilizerLogClient from "./FertilizerLogClient";

export default async function FertilizerLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const fertilizerLogs = createFertilizerLogRepository(businessContext);
  const sp = (await searchParams) ?? {};

  const fromRaw = typeof sp.from === "string" ? sp.from : "";
  const toRaw = typeof sp.to === "string" ? sp.to : "";
  const plantSkuRaw = typeof sp.plantSku === "string" ? sp.plantSku.trim() : "";
  const potSkuRaw = typeof sp.potSku === "string" ? sp.potSku.trim() : "";
  const productRaw = typeof sp.product === "string" ? sp.product.trim() : "";
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo ? { gte: validFrom ?? undefined, lte: validTo ?? undefined } : undefined;

  const rows = await fertilizerLogs.list({
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(plantSkuRaw ? { plantSku: { contains: plantSkuRaw, mode: "insensitive" as const } } : {}),
    ...(potSkuRaw ? { potSku: { contains: potSkuRaw, mode: "insensitive" as const } } : {}),
    ...(productRaw ? { product: { contains: productRaw, mode: "insensitive" as const } } : {}),
    ...(qRaw
      ? {
          OR: [
            { plantSku: { contains: qRaw, mode: "insensitive" as const } },
            { potSku: { contains: qRaw, mode: "insensitive" as const } },
            { product: { contains: qRaw, mode: "insensitive" as const } },
            { method: { contains: qRaw, mode: "insensitive" as const } },
            { unit: { contains: qRaw, mode: "insensitive" as const } },
            { notes: { contains: qRaw, mode: "insensitive" as const } },
          ],
        }
      : {}),
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
