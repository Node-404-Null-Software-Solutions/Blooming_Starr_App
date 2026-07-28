import { requireBusinessMembership } from "@/lib/authz";
import { createOverheadExpenseRepository } from "@/lib/repositories/overhead-expense";
import { sortByDateDescNullsLast } from "@/lib/sort";
import OverheadExpensesClient from "./OverheadExpensesClient";

export default async function OverheadExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const overheadExpenses = createOverheadExpenseRepository(businessContext);
  const sp = (await searchParams) ?? {};

  const fromRaw = typeof sp.from === "string" ? sp.from : "";
  const toRaw = typeof sp.to === "string" ? sp.to : "";
  const vendorRaw = typeof sp.vendor === "string" ? sp.vendor.trim() : "";
  const categoryRaw = typeof sp.category === "string" ? sp.category.trim() : "";
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo ? { gte: validFrom ?? undefined, lte: validTo ?? undefined } : undefined;

  const rows = await overheadExpenses.list({
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(vendorRaw ? { vendor: { contains: vendorRaw, mode: "insensitive" as const } } : {}),
    ...(categoryRaw ? { category: { contains: categoryRaw, mode: "insensitive" as const } } : {}),
    ...(qRaw
      ? {
          OR: [
            { vendor: { contains: qRaw, mode: "insensitive" as const } },
            { brand: { contains: qRaw, mode: "insensitive" as const } },
            { category: { contains: qRaw, mode: "insensitive" as const } },
            { description: { contains: qRaw, mode: "insensitive" as const } },
            {
              paymentMethod: {
                contains: qRaw,
                mode: "insensitive" as const,
              },
            },
            { cardLast4: { contains: qRaw, mode: "insensitive" as const } },
            {
              invoiceNumber: {
                contains: qRaw,
                mode: "insensitive" as const,
              },
            },
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
    vendor: row.vendor,
    brand: row.brand,
    category: row.category,
    description: row.description,
    qty: row.qty,
    subTotalCents: row.subTotalCents,
    shippingCents: row.shippingCents,
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
