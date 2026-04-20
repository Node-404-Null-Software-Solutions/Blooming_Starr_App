import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { sortByDateDescNullsLast } from "@/lib/sort";
import ProductIntakeClient from "./ProductIntakeClient";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toISOString().slice(0, 10);
}

function formatDateSort(date: Date | null): string {
  if (!date) return "";
  return date.toISOString();
}


export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessSlug } = await params;
  const sp = (await searchParams) ?? {};

  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) {
    return null;
  }

  const fromRaw = typeof sp.from === "string" ? sp.from : "";
  const toRaw = typeof sp.to === "string" ? sp.to : "";
  const vendorRaw = typeof sp.vendor === "string" ? sp.vendor.trim() : "";
  const categoryRaw = typeof sp.category === "string" ? sp.category.trim() : "";
  const skuRaw = typeof sp.sku === "string" ? sp.sku.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo ? { gte: validFrom ?? undefined, lte: validTo ?? undefined } : undefined;

  const rows = await db.productIntake.findMany({
    where: {
      businessId,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(vendorRaw ? { vendor: { contains: vendorRaw, mode: "insensitive" as const } } : {}),
      ...(categoryRaw ? { category: { contains: categoryRaw, mode: "insensitive" as const } } : {}),
      ...(skuRaw ? { sku: { contains: skuRaw, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const sortedRows = sortByDateDescNullsLast(rows);

  type Row = (typeof rows)[number];
  const viewRows = sortedRows.map((row: Row) => ({
    id: row.id,
    date: formatDate(row.date ?? null),
    dateSort: formatDateSort(row.date ?? null),
    vendor: row.vendor ?? "—",
    source: row.source ?? "—",
    category: row.category ?? "—",
    size: row.size ?? "—",
    style: row.style ?? "—",
    purchaseNumber: row.purchaseNumber ?? "—",
    qty: row.qty,
    sku: row.sku,
    unitCost: (row.unitCostCents ?? 0) / 100,
    totalCostCents: row.totalCostCents ?? 0,
    paymentMethod: row.paymentMethod ?? "—",
    cardLast4: row.cardLast4 ?? null,
    invoiceNumber: row.invoiceNumber ?? "—",
    notes: row.notes ?? "—",
  }));

  const showAdd = true;

  return (
    <ProductIntakeClient
      businessSlug={businessSlug}
      rows={viewRows}
      showAdd={showAdd}
    />
  );
}
