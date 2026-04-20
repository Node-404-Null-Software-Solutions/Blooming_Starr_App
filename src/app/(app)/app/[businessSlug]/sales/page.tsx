import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { sortByDateDescNullsLast } from "@/lib/sort";
import SalesModuleClient from "./SalesModuleClient";

export default async function SalesPage({
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
  const channelRaw = typeof sp.channel === "string" ? sp.channel.trim() : "";
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo
      ? { gte: validFrom ?? undefined, lte: validTo ?? undefined }
      : undefined;

  const rows = await db.salesEntry.findMany({
    where: {
      businessId,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(channelRaw
        ? { channel: { contains: channelRaw, mode: "insensitive" as const } }
        : {}),
      ...(qRaw
        ? {
            OR: [
              { sku: { contains: qRaw, mode: "insensitive" as const } },
              { itemName: { contains: qRaw, mode: "insensitive" as const } },
              { notes: { contains: qRaw, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const sortedRows = sortByDateDescNullsLast(rows);

  const hasRows = sortedRows.length > 0;
  type Row = (typeof rows)[number];
  const serializedRows = sortedRows.map((row: Row) => ({
    id: row.id,
    date: row.date ? row.date.toISOString() : null,
    sku: row.sku,
    itemName: row.itemName,
    qty: row.qty,
    salePriceCents: row.salePriceCents,
    totalSaleCents: row.totalSaleCents ?? 0,
    paymentMethod: row.paymentMethod,
    channel: row.channel,
    costCents: row.costCents,
    profitCents: row.profitCents ?? 0,
    marginPct: row.marginPct,
    notes: row.notes,
  }));

  return (
    <SalesModuleClient
      businessSlug={businessSlug}
      initialRows={serializedRows}
      hasRows={hasRows}
    />
  );
}
