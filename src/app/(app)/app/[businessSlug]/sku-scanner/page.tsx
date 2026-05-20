import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import SkuScannerClient, { type InventoryLookupItem } from "./SkuScannerClient";

export default async function SkuScannerPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  const [productIntakes, plantIntakes, salesRows, transplantRows] =
    await Promise.all([
      db.productIntake.findMany({
        where: { businessId },
        select: {
          sku: true,
          vendor: true,
          category: true,
          size: true,
          style: true,
          qty: true,
          unitCostCents: true,
        },
      }),
      db.plantIntake.findMany({
        where: { businessId },
        select: {
          sku: true,
          genus: true,
          cultivar: true,
          qty: true,
          costCents: true,
          msrpCents: true,
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

  const salesBySku = new Map<string, number>();
  for (const sale of salesRows) {
    salesBySku.set(sale.sku, (salesBySku.get(sale.sku) ?? 0) + sale.qty);
  }

  const productMap = new Map<
    string,
    {
      name: string;
      qtyPurchased: number;
      costCents: number;
    }
  >();

  for (const row of productIntakes) {
    const name = [row.category, row.style, row.size].filter(Boolean).join(" - ");
    const existing = productMap.get(row.sku);
    if (existing) {
      existing.qtyPurchased += row.qty;
      if (row.unitCostCents) existing.costCents = row.unitCostCents;
    } else {
      productMap.set(row.sku, {
        name: name || row.vendor || row.sku,
        qtyPurchased: row.qty,
        costCents: row.unitCostCents,
      });
    }
  }

  const items: InventoryLookupItem[] = [];
  for (const [sku, data] of productMap) {
    const qtySold = salesBySku.get(sku) ?? 0;
    const qtyRemaining = Math.max(0, data.qtyPurchased - qtySold);
    items.push({
      sku,
      kind: "Product",
      name: data.name,
      qtyPurchased: data.qtyPurchased,
      qtySold,
      qtyUsed: 0,
      qtyRemaining,
      costCents: data.costCents,
      salePriceCents: 0,
      status: qtyRemaining <= 0 && qtySold > 0 ? "Sold Out" : "In Stock",
      href: `/app/${businessSlug}/product-inventory`,
    });
  }

  const plantMap = new Map<
    string,
    {
      name: string;
      qtyPurchased: number;
      qtyUsed: number;
      costCents: number;
      salePriceCents: number;
      statuses: string[];
    }
  >();

  for (const row of plantIntakes) {
    const name = [row.genus, row.cultivar].filter(Boolean).join(" ");
    const status = (row.status ?? "").toLowerCase().trim();
    const isUsed =
      status === "dead" || status === "giveaway" || status === "donation";
    const existing = plantMap.get(row.sku);
    if (existing) {
      existing.qtyPurchased += row.qty;
      existing.costCents += row.costCents;
      existing.salePriceCents += row.msrpCents;
      if (isUsed) existing.qtyUsed += row.qty;
      existing.statuses.push(status);
    } else {
      plantMap.set(row.sku, {
        name: name || row.sku,
        qtyPurchased: row.qty,
        qtyUsed: isUsed ? row.qty : 0,
        costCents: row.costCents,
        salePriceCents: row.msrpCents,
        statuses: [status],
      });
    }
  }

  for (const row of transplantRows) {
    if (!row.divisionSku || plantMap.has(row.divisionSku)) continue;
    const parent = plantMap.get(row.originalSku ?? "");
    plantMap.set(row.divisionSku, {
      name: parent?.name ?? row.divisionSku,
      qtyPurchased: 1,
      qtyUsed: 0,
      costCents: 0,
      salePriceCents: 0,
      statuses: ["available"],
    });
  }

  for (const [sku, data] of plantMap) {
    const qtySold = salesBySku.get(sku) ?? 0;
    const qtyRemaining = Math.max(0, data.qtyPurchased - qtySold - data.qtyUsed);
    let status = "Available";
    if (qtyRemaining <= 0 && qtySold > 0) status = "Sold";
    if (data.statuses.every((s) => s === "dead")) status = "Dead";
    if (data.statuses.every((s) => s === "damaged")) status = "Damaged";
    if (data.statuses.every((s) => s === "giveaway")) status = "Giveaway";
    if (data.statuses.every((s) => s === "donation")) status = "Donation";

    items.push({
      sku,
      kind: "Plant",
      name: data.name,
      qtyPurchased: data.qtyPurchased,
      qtySold,
      qtyUsed: data.qtyUsed,
      qtyRemaining,
      costCents: data.costCents,
      salePriceCents: data.salePriceCents,
      status,
      href: `/app/${businessSlug}/plant-inventory`,
    });
  }

  items.sort((a, b) => a.sku.localeCompare(b.sku));

  return <SkuScannerClient businessSlug={businessSlug} items={items} />;
}
