import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";

type SkuRow = {
  sku: string;
  source: "Plant Intake" | "Product Intake" | "Transplant Log";
};

export default async function SkuMasterPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  await params;
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  const [plantSkus, productSkus, transplantSkus] = await Promise.all([
    db.plantIntake.findMany({
      where: { businessId },
      select: { sku: true },
      distinct: ["sku"],
    }),
    db.productIntake.findMany({
      where: { businessId },
      select: { sku: true },
      distinct: ["sku"],
    }),
    db.transplantLog.findMany({
      where: { businessId, divisionSku: { not: null } },
      select: { divisionSku: true },
      distinct: ["divisionSku"],
    }),
  ]);

  const skuMap = new Map<string, SkuRow["source"]>();
  for (const r of plantSkus) skuMap.set(r.sku, "Plant Intake");
  for (const r of productSkus) {
    if (!skuMap.has(r.sku)) skuMap.set(r.sku, "Product Intake");
  }
  for (const r of transplantSkus) {
    if (r.divisionSku && !skuMap.has(r.divisionSku))
      skuMap.set(r.divisionSku, "Transplant Log");
  }

  const rows: SkuRow[] = Array.from(skuMap.entries())
    .map(([sku, source]) => ({ sku, source }))
    .sort((a, b) => a.sku.localeCompare(b.sku));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">SKU Master</h1>
        <p className="text-sm text-gray-600">
          All unique SKUs across plant intake, product intake, and transplant log.
          <span className="ml-2 font-medium text-gray-900">{rows.length} SKUs</span>
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          No SKUs found. Import data to populate this list.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Source</th>
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
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.source === "Plant Intake"
                          ? "bg-green-100 text-green-700"
                          : row.source === "Product Intake"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {row.source}
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
