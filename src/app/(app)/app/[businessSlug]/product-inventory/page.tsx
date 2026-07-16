import { requireBusinessMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatAppDate } from "@/lib/date-format";
import ProductInventoryClient, {
  type ProductInventoryRow,
} from "./ProductInventoryClient";

function formatDate(value: Date | null) {
  return formatAppDate(value);
}

export default async function ProductInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { businessSlug } = await params;
  const sp = (await searchParams) ?? {};
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const { business } = await requireBusinessMembership(businessSlug);
  const businessId = business.id;

  const [productIntakeRows, salesRows] = await Promise.all([
    db.productIntake.findMany({
      where: { businessId },
      select: {
        sku: true,
        date: true,
        vendor: true,
        category: true,
        style: true,
        size: true,
        qty: true,
        totalCostCents: true,
        unitCostCents: true,
        notes: true,
        createdAt: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.salesEntry.findMany({
      where: { businessId },
      select: { sku: true, qty: true },
    }),
  ]);

  const productSkuSet = new Set(productIntakeRows.map((product) => product.sku));
  const skuMap = new Map<
    string,
    {
      sku: string;
      date: Date | null;
      createdAt: Date;
      productName: string;
      unitCostCents: number;
      totalCostCents: number;
      qtyPurchased: number;
      qtySold: number;
      notes: string | null;
    }
  >();

  for (const row of productIntakeRows) {
    const name = [row.category, row.style, row.size].filter(Boolean).join(" - ");
    const existing = skuMap.get(row.sku);
    if (existing) {
      existing.qtyPurchased += row.qty;
      existing.totalCostCents += row.totalCostCents;
      if (row.unitCostCents) existing.unitCostCents = row.unitCostCents;
      if ((row.date ?? row.createdAt) > (existing.date ?? existing.createdAt)) {
        existing.date = row.date;
        existing.createdAt = row.createdAt;
        existing.productName = name || row.vendor || row.sku;
        existing.notes = row.notes;
      }
    } else {
      skuMap.set(row.sku, {
        sku: row.sku,
        date: row.date,
        createdAt: row.createdAt,
        productName: name || row.vendor || row.sku,
        unitCostCents: row.unitCostCents,
        totalCostCents: row.totalCostCents,
        qtyPurchased: row.qty,
        qtySold: 0,
        notes: row.notes,
      });
    }
  }

  for (const sale of salesRows) {
    if (!productSkuSet.has(sale.sku)) continue;
    const entry = skuMap.get(sale.sku);
    if (entry) entry.qtySold += sale.qty;
  }

  const rows: ProductInventoryRow[] = Array.from(skuMap.values()).map((item) => {
    const qtyRemaining = item.qtyPurchased - item.qtySold;
    return {
      sku: item.sku,
      date: formatDate(item.date),
      dateSort: item.date ? item.date.toISOString() : "",
      productName: item.productName,
      status: qtyRemaining <= 0 && item.qtySold > 0 ? "Sold Out" : "In Stock",
      unitCostCents: item.unitCostCents,
      totalCostCents: item.totalCostCents,
      qtyPurchased: item.qtyPurchased,
      qtySold: item.qtySold,
      qtyRemaining: Math.max(0, qtyRemaining),
      notes: item.notes,
    };
  });

  rows.sort((a, b) => {
    const dateCompare = b.dateSort.localeCompare(a.dateSort);
    return (
      dateCompare ||
      a.productName.localeCompare(b.productName) ||
      a.sku.localeCompare(b.sku)
    );
  });

  return (
    <ProductInventoryClient
      businessSlug={businessSlug}
      rows={rows}
      initialQ={qRaw}
    />
  );
}
