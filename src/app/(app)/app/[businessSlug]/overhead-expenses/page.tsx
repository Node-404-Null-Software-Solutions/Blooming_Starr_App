import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { sortByDateDescNullsLast } from "@/lib/sort";
import OverheadExpensesClient from "./OverheadExpensesClient";

export default async function OverheadExpensesPage({
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
  const vendorRaw = typeof sp.vendor === "string" ? sp.vendor.trim() : "";
  const categoryRaw = typeof sp.category === "string" ? sp.category.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo ? { gte: validFrom ?? undefined, lte: validTo ?? undefined } : undefined;

  const rows = await db.overheadExpense.findMany({
    where: {
      businessId,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(vendorRaw ? { vendor: { contains: vendorRaw, mode: "insensitive" as const } } : {}),
      ...(categoryRaw ? { category: { contains: categoryRaw, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const sortedRows = sortByDateDescNullsLast(rows);

  const hasRows = sortedRows.length > 0;
  type Row = (typeof rows)[number];
  const serialized = sortedRows.map((row: Row) => ({
    id: row.id,
    date: row.date ? row.date.toISOString() : null,
    vendor: row.vendor,
    brand: row.brand,
    category: row.category,
    description: row.description,
    qty: row.qty,
    subTotalCents: row.subTotalCents,
    discountCents: row.discountCents,
    unitCostCents: row.unitCostCents,
    totalCents: row.totalCents,
    paymentMethod: row.paymentMethod,
    cardLast4: row.cardLast4,
    invoiceNumber: row.invoiceNumber,
    notes: row.notes,
  }));

  return (
    <OverheadExpensesClient
      businessSlug={businessSlug}
      rows={serialized}
      hasRows={hasRows}
    />
  );
}
