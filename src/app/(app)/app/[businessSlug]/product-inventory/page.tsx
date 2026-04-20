import Link from "next/link";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { centsToUsdFixed as money } from "@/lib/formulas";

type InventoryRow = {
  sku: string;
  productName: string;
  unitCostCents: number;
  qtyPurchased: number;
  qtySold: number;
  qtyRemaining: number;
  status: string;
};

export default async function ProductInventoryPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  const [productIntakeRows, salesRows] = await Promise.all([
    db.productIntake.findMany({
      where: { businessId },
      select: {
        sku: true,
        vendor: true,
        category: true,
        style: true,
        size: true,
        qty: true,
        totalCostCents: true,
        unitCostCents: true,
      },
    }),
    db.salesEntry.findMany({
      where: { businessId },
      select: { sku: true, qty: true },
    }),
  ]);

  // Collect product SKUs for matching
  const productSkuSet = new Set(productIntakeRows.map((p) => p.sku));

  // Build inventory by SKU
  const skuMap = new Map<
    string,
    {
      productName: string;
      unitCostCents: number;
      qtyPurchased: number;
      qtySold: number;
    }
  >();

  for (const row of productIntakeRows) {
    const name = [row.category, row.style, row.size].filter(Boolean).join(" - ");
    const existing = skuMap.get(row.sku);
    if (existing) {
      existing.qtyPurchased += row.qty;
      // Weighted average would be complex; use latest unit cost
      if (row.unitCostCents) existing.unitCostCents = row.unitCostCents;
    } else {
      skuMap.set(row.sku, {
        productName: name || row.vendor || row.sku,
        unitCostCents: row.unitCostCents,
        qtyPurchased: row.qty,
        qtySold: 0,
      });
    }
  }

  // Tally sales (only for product SKUs)
  for (const sale of salesRows) {
    if (!productSkuSet.has(sale.sku)) continue;
    const entry = skuMap.get(sale.sku);
    if (entry) {
      entry.qtySold += sale.qty;
    }
  }

  // Build final rows
  const rows: InventoryRow[] = [];
  for (const [sku, data] of skuMap) {
    const qtyRemaining = data.qtyPurchased - data.qtySold;
    rows.push({
      sku,
      productName: data.productName,
      unitCostCents: data.unitCostCents,
      qtyPurchased: data.qtyPurchased,
      qtySold: data.qtySold,
      qtyRemaining: Math.max(0, qtyRemaining),
      status: qtyRemaining <= 0 && data.qtySold > 0 ? "Sold Out" : "In Stock",
    });
  }

  rows.sort((a, b) => a.sku.localeCompare(b.sku));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Product Inventory</h1>
          <p className="text-sm text-gray-600">
            Computed from product intake and sales records.
          </p>
        </div>
        <Link
          href={`/app/${businessSlug}/product-intake`}
          className="text-sm font-medium text-(--primary) hover:underline"
        >
          View product intake →
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          No product inventory data.{" "}
          <Link
            href={`/app/${businessSlug}/product-intake/import`}
            className="text-(--primary) hover:underline"
          >
            Import product intake data
          </Link>{" "}
          to populate this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Product Name</th>
                <th className="px-3 py-2 text-right">Unit Cost</th>
                <th className="px-3 py-2 text-right">Purchased</th>
                <th className="px-3 py-2 text-right">Sold</th>
                <th className="px-3 py-2 text-right">Remaining</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.sku}
                  className="border-t border-gray-100 text-gray-700"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    {row.sku}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2" title={row.productName}>
                    {row.productName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {money(row.unitCostCents)}
                  </td>
                  <td className="px-3 py-2 text-right">{row.qtyPurchased}</td>
                  <td className="px-3 py-2 text-right">{row.qtySold}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {row.qtyRemaining}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === "In Stock"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
