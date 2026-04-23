import Link from "next/link";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { centsToUsdFixed as money } from "@/lib/formulas";

type InventoryRow = {
  sku: string;
  productName: string;
  costCents: number;
  msrpCents: number;
  qtyPurchased: number;
  qtySold: number;
  qtyUsed: number;
  qtyRemaining: number;
  status: string;
};

export default async function PlantInventoryPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  const [plantIntakeRows, salesRows, transplantRows] = await Promise.all([
    db.plantIntake.findMany({
      where: { businessId },
      select: {
        sku: true,
        genus: true,
        cultivar: true,
        costCents: true,
        msrpCents: true,
        qty: true,
        status: true,
      },
    }),
    db.salesEntry.findMany({
      where: { businessId },
      select: { sku: true, qty: true },
    }),
    db.transplantLog.findMany({
      where: { businessId, divisionSku: { not: null } },
      select: { divisionSku: true, originalSku: true },
    }),
  ]);

  // Build inventory by SKU
  const skuMap = new Map<
    string,
    {
      productName: string;
      costCents: number;
      msrpCents: number;
      qtyPurchased: number;
      qtySold: number;
      qtyUsed: number;
      statuses: string[];
    }
  >();

  for (const row of plantIntakeRows) {
    const existing = skuMap.get(row.sku);
    const name = [row.genus, row.cultivar].filter(Boolean).join(" ");
    const status = (row.status ?? "").toLowerCase().trim();
    if (existing) {
      existing.qtyPurchased += row.qty;
      existing.costCents += row.costCents;
      existing.msrpCents += row.msrpCents;
      if (status === "dead" || status === "giveaway" || status === "donation") {
        existing.qtyUsed += row.qty;
      }
      existing.statuses.push(status);
    } else {
      skuMap.set(row.sku, {
        productName: name,
        costCents: row.costCents,
        msrpCents: row.msrpCents,
        qtyPurchased: row.qty,
        qtySold: 0,
        qtyUsed:
          status === "dead" || status === "giveaway" || status === "donation"
            ? row.qty
            : 0,
        statuses: [status],
      });
    }
  }

  // Add transplant divisions as new inventory (qty 1 each)
  for (const t of transplantRows) {
    if (!t.divisionSku || skuMap.has(t.divisionSku)) continue;
    const parent = skuMap.get(t.originalSku ?? "");
    skuMap.set(t.divisionSku, {
      productName: parent?.productName ?? t.divisionSku,
      costCents: 0,
      msrpCents: 0,
      qtyPurchased: 1,
      qtySold: 0,
      qtyUsed: 0,
      statuses: ["available"],
    });
  }

  // Tally sales by SKU
  for (const sale of salesRows) {
    const entry = skuMap.get(sale.sku);
    if (entry) {
      entry.qtySold += sale.qty;
    }
  }

  // Build final rows
  const rows: InventoryRow[] = [];
  for (const [sku, data] of skuMap) {
    const qtyRemaining = data.qtyPurchased - data.qtySold - data.qtyUsed;
    let status = "Available";
    if (qtyRemaining <= 0 && data.qtySold > 0) status = "Sold";
    if (data.statuses.every((s) => s === "dead")) status = "Dead";
    if (data.statuses.every((s) => s === "damaged")) status = "Damaged";
    if (data.statuses.every((s) => s === "giveaway")) status = "Giveaway";
    if (data.statuses.every((s) => s === "donation")) status = "Donation";

    rows.push({
      sku,
      productName: data.productName,
      costCents: data.costCents,
      msrpCents: data.msrpCents,
      qtyPurchased: data.qtyPurchased,
      qtySold: data.qtySold,
      qtyUsed: data.qtyUsed,
      qtyRemaining: Math.max(0, qtyRemaining),
      status,
    });
  }

  rows.sort((a, b) => a.sku.localeCompare(b.sku));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Plant Inventory</h1>
          <p className="text-sm text-gray-600">
            Computed from plant intake, sales, and transplant records.
          </p>
        </div>
        <Link
          href={`/app/${businessSlug}/plant-intake`}
          className="text-sm font-medium text-(--primary) hover:underline"
        >
          View plant intake →
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          No plant inventory data.{" "}
          <Link
            href={`/app/${businessSlug}/settings/import`}
            className="text-(--primary) hover:underline"
          >
            Import plant intake data
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
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">MSRP</th>
                <th className="px-3 py-2 text-right">Purchased</th>
                <th className="px-3 py-2 text-right">Sold</th>
                <th className="px-3 py-2 text-right">Used</th>
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
                    {money(row.costCents)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {money(row.msrpCents)}
                  </td>
                  <td className="px-3 py-2 text-right">{row.qtyPurchased}</td>
                  <td className="px-3 py-2 text-right">{row.qtySold}</td>
                  <td className="px-3 py-2 text-right">{row.qtyUsed}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {row.qtyRemaining}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === "Available"
                          ? "bg-green-100 text-green-700"
                          : row.status === "Sold"
                          ? "bg-blue-100 text-blue-700"
                          : row.status === "Dead"
                          ? "bg-red-100 text-red-700"
                          : row.status === "Damaged"
                          ? "bg-orange-100 text-orange-700"
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
