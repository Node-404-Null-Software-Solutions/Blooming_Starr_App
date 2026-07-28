import { requireBusinessMembership } from "@/lib/authz";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import { createProductIntakeRepository } from "@/lib/repositories/product-intake";
import { recordPhotoUrl } from "@/lib/record-photo";
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

  const { businessContext } = await requireBusinessMembership(businessSlug);
  const productIntakes = createProductIntakeRepository(businessContext);

  const fromRaw = typeof sp.from === "string" ? sp.from : "";
  const toRaw = typeof sp.to === "string" ? sp.to : "";
  const vendorRaw = typeof sp.vendor === "string" ? sp.vendor.trim() : "";
  const categoryRaw = typeof sp.category === "string" ? sp.category.trim() : "";
  const skuRaw = typeof sp.sku === "string" ? sp.sku.trim() : "";
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const fromDate = fromRaw ? new Date(fromRaw) : null;
  const toDate = toRaw ? new Date(toRaw) : null;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  const dateFilter =
    validFrom || validTo ? { gte: validFrom ?? undefined, lte: validTo ?? undefined } : undefined;

  const rows = await productIntakes.list({
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(vendorRaw
      ? { vendor: { contains: vendorRaw, mode: "insensitive" as const } }
      : {}),
    ...(categoryRaw
      ? { category: { contains: categoryRaw, mode: "insensitive" as const } }
      : {}),
    ...(skuRaw
      ? { sku: { contains: skuRaw, mode: "insensitive" as const } }
      : {}),
    ...(qRaw
      ? {
          OR: [
            { sku: { contains: qRaw, mode: "insensitive" as const } },
            { vendor: { contains: qRaw, mode: "insensitive" as const } },
            { source: { contains: qRaw, mode: "insensitive" as const } },
            { category: { contains: qRaw, mode: "insensitive" as const } },
            { size: { contains: qRaw, mode: "insensitive" as const } },
            { style: { contains: qRaw, mode: "insensitive" as const } },
            {
              purchaseNumber: {
                contains: qRaw,
                mode: "insensitive" as const,
              },
            },
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
    photoUrl:
      row.photoContentType && row.photoUpdatedAt
        ? recordPhotoUrl(
            businessSlug,
            "product-intake",
            row.id,
            row.photoUpdatedAt,
          )
        : null,
    invoiceNumber: row.invoiceNumber ?? "—",
    notes: row.notes ?? "—",
  }));

  const lookups = await getLookupEntriesMulti(businessSlug, [
    "productSource",
    "productCategory",
    "productSize",
    "productStyle",
    "paymentMethod",
  ]);

  const showAdd = true;

  return (
    <ProductIntakeClient
      businessSlug={businessSlug}
      rows={viewRows}
      lookups={lookups}
      showAdd={showAdd}
    />
  );
}
