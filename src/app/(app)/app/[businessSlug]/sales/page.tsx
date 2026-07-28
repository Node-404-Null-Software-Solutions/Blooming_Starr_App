import { requireBusinessMembership } from "@/lib/authz";
import { createSalesRepository } from "@/lib/repositories/sales";
import { sortByDateDescNullsLast } from "@/lib/sort";
import SalesModuleClient from "./SalesModuleClient";

export default async function SalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const sales = createSalesRepository(businessContext);
  const sp = (await searchParams) ?? {};

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

  const rows = await sales.list({
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(channelRaw
        ? { channel: { contains: channelRaw, mode: "insensitive" as const } }
        : {}),
      ...(qRaw
        ? {
            OR: [
              { sku: { contains: qRaw, mode: "insensitive" as const } },
              { customerName: { contains: qRaw, mode: "insensitive" as const } },
              { itemName: { contains: qRaw, mode: "insensitive" as const } },
              { status: { contains: qRaw, mode: "insensitive" as const } },
              { notes: { contains: qRaw, mode: "insensitive" as const } },
            ],
          }
        : {}),
  });
  const sortedRows = sortByDateDescNullsLast(rows);

  const hasRows = sortedRows.length > 0;
  type Row = (typeof rows)[number];
  const serializedRows = sortedRows.map((row: Row) => ({
    id: row.id,
    date: row.date ? row.date.toISOString() : null,
    sku: row.sku,
    customerName: row.customerName,
    itemName: row.itemName,
    status: row.status,
    qty: row.qty,
    salePriceCents: row.salePriceCents,
    totalSaleCents: row.totalSaleCents ?? 0,
    paymentMethod: row.paymentMethod,
    cardLast4: row.cardLast4,
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
