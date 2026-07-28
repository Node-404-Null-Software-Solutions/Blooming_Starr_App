import { requireBusinessMembership } from "@/lib/authz";
import { formatAppDate } from "@/lib/date-format";
import { createProductIntakeRepository } from "@/lib/repositories/product-intake";
import { createSalesRepository } from "@/lib/repositories/sales";
import { recordPhotoUrl } from "@/lib/record-photo";
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
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const sales = createSalesRepository(businessContext);
  const productIntakes = createProductIntakeRepository(businessContext);

  const [productIntakeRows, salesRows] = await Promise.all([
    productIntakes.listInventoryFacts(),
    sales.listInventoryFacts(),
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
      photoUrl: string | null;
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
      if (!existing.photoUrl && row.photoContentType && row.photoUpdatedAt) {
        existing.photoUrl = recordPhotoUrl(
          businessSlug,
          "product-intake",
          row.id,
          row.photoUpdatedAt,
        );
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
        photoUrl:
          row.photoContentType && row.photoUpdatedAt
            ? recordPhotoUrl(
                businessSlug,
                "product-intake",
                row.id,
                row.photoUpdatedAt,
              )
            : null,
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
      photoUrl: item.photoUrl,
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
