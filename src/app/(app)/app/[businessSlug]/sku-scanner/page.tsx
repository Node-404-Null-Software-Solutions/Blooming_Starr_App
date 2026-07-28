import { requireBusinessMembership } from "@/lib/authz";
import { createPlantIntakeRepository } from "@/lib/repositories/plant-intake";
import { createProductIntakeRepository } from "@/lib/repositories/product-intake";
import { createSalesRepository } from "@/lib/repositories/sales";
import { createTransplantLogRepository } from "@/lib/repositories/transplant-log";
import {
  plantIntakeTotalCostCents,
  plantIntakeUnitCostCents,
} from "@/lib/plant-intake-cost";
import SkuScannerClient, { type InventoryLookupItem } from "./SkuScannerClient";

export default async function SkuScannerPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const sales = createSalesRepository(businessContext);
  const plantIntakeRepo = createPlantIntakeRepository(businessContext);
  const productIntakeRepo = createProductIntakeRepository(businessContext);
  const transplants = createTransplantLogRepository(businessContext);

  const [productIntakes, plantIntakes, salesRows, transplantRows] =
    await Promise.all([
      productIntakeRepo.listForScanner(),
      plantIntakeRepo.listForScanner(),
      sales.listInventoryFacts(),
      transplants.listScannerDivisions(),
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
      totalCostCents: number;
      totalSalePriceCents: number;
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
      existing.totalCostCents += plantIntakeTotalCostCents(
        row.costCents,
        row.qty,
      );
      existing.totalSalePriceCents += plantIntakeTotalCostCents(
        row.msrpCents,
        row.qty,
      );
      if (isUsed) existing.qtyUsed += row.qty;
      existing.statuses.push(status);
    } else {
      plantMap.set(row.sku, {
        name: name || row.sku,
        qtyPurchased: row.qty,
        qtyUsed: isUsed ? row.qty : 0,
        totalCostCents: plantIntakeTotalCostCents(row.costCents, row.qty),
        totalSalePriceCents: plantIntakeTotalCostCents(
          row.msrpCents,
          row.qty,
        ),
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
      totalCostCents: 0,
      totalSalePriceCents: 0,
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
      costCents: plantIntakeUnitCostCents(
        data.totalCostCents,
        data.qtyPurchased,
      ),
      salePriceCents: plantIntakeUnitCostCents(
        data.totalSalePriceCents,
        data.qtyPurchased,
      ),
      status,
      href: `/app/${businessSlug}/plant-inventory`,
    });
  }

  items.sort((a, b) => a.sku.localeCompare(b.sku));

  return <SkuScannerClient businessSlug={businessSlug} items={items} />;
}
