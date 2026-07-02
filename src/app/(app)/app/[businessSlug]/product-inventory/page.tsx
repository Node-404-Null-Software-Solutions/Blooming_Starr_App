import Link from "next/link";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { centsToUsdFixed as money } from "@/lib/formulas";
import ModuleHeader from "../_components/ModuleHeader";

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

  const productSkuSet = new Set(productIntakeRows.map((p) => p.sku));
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

  for (const sale of salesRows) {
    if (!productSkuSet.has(sale.sku)) continue;
    const entry = skuMap.get(sale.sku);
    if (entry) {
      entry.qtySold += sale.qty;
    }
  }

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

  const headCell =
    "sticky top-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-800";
  const bodyCell =
    "border-b border-r border-gray-200 px-3 py-1.5 align-middle text-xs text-gray-700";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <ModuleHeader title="Product Inventory" showFilter={false} />

      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 text-sm text-gray-700">
        <span>Computed from product intake and sales records.</span>
        <Link
          href={`/app/${businessSlug}/product-intake`}
          className="shrink-0 font-medium text-(--primary) hover:underline"
        >
          View product intake
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="m-4 rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          No product inventory data.{" "}
          <Link
            href={`/app/${businessSlug}/settings/import`}
            className="text-(--primary) hover:underline"
          >
            Import product intake data
          </Link>{" "}
          to populate this view.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse bg-white">
            <thead>
              <tr>
                <th className={headCell}>SKU</th>
                <th className={headCell}>Product Name</th>
                <th className={`${headCell} text-right`}>Unit Cost</th>
                <th className={`${headCell} text-right`}>Purchased</th>
                <th className={`${headCell} text-right`}>Sold</th>
                <th className={`${headCell} text-right`}>Remaining</th>
                <th className={headCell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sku} className="h-9 hover:bg-green-50/50">
                  <td className={`${bodyCell} whitespace-nowrap font-mono`}>
                    {row.sku}
                  </td>
                  <td
                    className={`${bodyCell} max-w-[240px] truncate`}
                    title={row.productName}
                  >
                    {row.productName}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap text-right`}>
                    {money(row.unitCostCents)}
                  </td>
                  <td className={`${bodyCell} text-right`}>{row.qtyPurchased}</td>
                  <td className={`${bodyCell} text-right`}>{row.qtySold}</td>
                  <td className={`${bodyCell} text-right font-medium`}>
                    {row.qtyRemaining}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap`}>
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
