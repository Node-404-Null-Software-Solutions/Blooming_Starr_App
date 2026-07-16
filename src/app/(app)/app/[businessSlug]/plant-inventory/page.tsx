import { requireBusinessMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatAppDate } from "@/lib/date-format";
import PlantInventoryClient, { type PlantInventoryRow } from "./PlantInventoryClient";

function formatDate(value: Date | null) {
  return formatAppDate(value);
}

function normalizeStatus(value: string | null | undefined, qtyRemaining: number, qtySold: number) {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  if (qtyRemaining <= 0 && qtySold > 0) return "Sold";
  return "For Sale";
}

function isUsedStatus(status: string | null | undefined) {
  const normalized = status?.toLowerCase().trim();
  return (
    normalized === "dead" ||
    normalized === "damaged" ||
    normalized === "giveaway" ||
    normalized === "donation" ||
    normalized === "not for sale"
  );
}

function profitFor(status: string, saleBasisCents: number, totalCostCents: number) {
  if (saleBasisCents > 0) return saleBasisCents - totalCostCents;
  return isUsedStatus(status) ? -totalCostCents : 0;
}

function marginFor(profitCents: number, saleBasisCents: number) {
  if (saleBasisCents > 0) return (profitCents / saleBasisCents) * 100;
  if (profitCents < 0) return -100;
  return null;
}

export default async function PlantInventoryPage({
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

  const [plantIntakeRows, salesRows, pricingRows, transplantRows] = await Promise.all([
    db.plantIntake.findMany({
      where: { businessId },
      select: {
        sku: true,
        date: true,
        genus: true,
        cultivar: true,
        costCents: true,
        msrpCents: true,
        qty: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.salesEntry.findMany({
      where: { businessId },
      select: {
        sku: true,
        qty: true,
        salePriceCents: true,
        totalSaleCents: true,
        profitCents: true,
        marginPct: true,
      },
    }),
    db.pricingEntry.findMany({
      where: { businessId },
      select: {
        sku: true,
        date: true,
        productName: true,
        plantCostCents: true,
        potOrProdCostCents: true,
        overheadCents: true,
        totalCostCents: true,
        estimatedSellPriceCents: true,
        actualSellPriceCents: true,
        profitCents: true,
        marginPct: true,
        status: true,
        notes: true,
        msrpCents: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    db.transplantLog.findMany({
      where: { businessId },
      select: { originalSku: true, divisionSku: true, costCents: true },
    }),
  ]);

  const salesMap = new Map<
    string,
    {
      qtySold: number;
      totalSaleCents: number;
      lastUnitSaleCents: number;
    }
  >();
  for (const sale of salesRows) {
    const entry = salesMap.get(sale.sku) ?? {
      qtySold: 0,
      totalSaleCents: 0,
      lastUnitSaleCents: 0,
    };
    entry.qtySold += sale.qty;
    entry.totalSaleCents += sale.totalSaleCents || sale.salePriceCents * sale.qty;
    if (sale.salePriceCents > 0) entry.lastUnitSaleCents = sale.salePriceCents;
    salesMap.set(sale.sku, entry);
  }

  const pricingMap = new Map<string, (typeof pricingRows)[number]>();
  for (const row of pricingRows) {
    if (!pricingMap.has(row.sku)) pricingMap.set(row.sku, row);
  }

  const intakeMap = new Map<
    string,
    {
      sku: string;
      date: Date | null;
      createdAt: Date;
      plantName: string;
      plantCostCents: number;
      plantMsrpCents: number;
      qtyPurchased: number;
      qtyUsed: number;
      statuses: string[];
    }
  >();

  for (const row of plantIntakeRows) {
    const existing = intakeMap.get(row.sku);
    const plantName = [row.genus, row.cultivar].filter(Boolean).join(" ");
    const status = row.status ?? "";
    if (existing) {
      existing.qtyPurchased += row.qty;
      existing.plantCostCents += row.costCents;
      existing.plantMsrpCents += row.msrpCents;
      existing.statuses.push(status);
      if (isUsedStatus(status)) existing.qtyUsed += row.qty;
      if ((row.date ?? row.createdAt) > (existing.date ?? existing.createdAt)) {
        existing.date = row.date;
        existing.createdAt = row.createdAt;
        existing.plantName = plantName;
      }
    } else {
      intakeMap.set(row.sku, {
        sku: row.sku,
        date: row.date,
        createdAt: row.createdAt,
        plantName,
        plantCostCents: row.costCents,
        plantMsrpCents: row.msrpCents,
        qtyPurchased: row.qty,
        qtyUsed: isUsedStatus(status) ? row.qty : 0,
        statuses: [status],
      });
    }
  }

  for (const transplant of transplantRows) {
    if (!transplant.divisionSku || intakeMap.has(transplant.divisionSku)) continue;
    const parent = intakeMap.get(transplant.originalSku ?? "");
    intakeMap.set(transplant.divisionSku, {
      sku: transplant.divisionSku,
      date: null,
      createdAt: new Date(0),
      plantName: parent?.plantName ?? transplant.divisionSku,
      plantCostCents: transplant.costCents,
      plantMsrpCents: 0,
      qtyPurchased: 1,
      qtyUsed: 0,
      statuses: ["For Sale"],
    });
  }

  const rows: PlantInventoryRow[] = Array.from(intakeMap.values()).map((item) => {
    const pricing = pricingMap.get(item.sku);
    const sales = salesMap.get(item.sku);
    const qtySold = sales?.qtySold ?? 0;
    const status = normalizeStatus(pricing?.status ?? item.statuses[0], item.qtyPurchased - qtySold - item.qtyUsed, qtySold);
    const qtyUsed = item.qtyUsed;
    const qtyRemaining = Math.max(0, item.qtyPurchased - qtySold - qtyUsed);
    const plantCostCents = pricing?.plantCostCents || item.plantCostCents;
    const otherCostCents = pricing
      ? pricing.potOrProdCostCents + pricing.overheadCents
      : 0;
    const totalCostCents =
      pricing?.totalCostCents || plantCostCents + otherCostCents;
    const plantMsrpCents = item.plantMsrpCents;
    const otherMsrpCents = pricing?.msrpCents ?? 0;
    const totalMsrpCents = plantMsrpCents + otherMsrpCents;
    const estimatedSalePriceCents = pricing?.estimatedSellPriceCents ?? 0;
    const actualSellPriceCents =
      sales && sales.qtySold > 0
        ? Math.round(sales.totalSaleCents / sales.qtySold)
        : pricing?.actualSellPriceCents ?? 0;
    const saleBasisCents = actualSellPriceCents || estimatedSalePriceCents;
    const profitCents =
      pricing && (pricing.actualSellPriceCents > 0 || pricing.estimatedSellPriceCents > 0)
        ? pricing.profitCents || profitFor(status, saleBasisCents, totalCostCents)
        : profitFor(status, saleBasisCents, totalCostCents);
    const marginPct =
      pricing?.marginPct ?? marginFor(profitCents, saleBasisCents);

    return {
      sku: item.sku,
      date: formatDate(item.date),
      dateSort: item.date ? item.date.toISOString() : "",
      plantName: pricing?.productName || item.plantName,
      status,
      plantCostCents,
      otherCostCents,
      totalCostCents,
      plantMsrpCents,
      otherMsrpCents,
      totalMsrpCents,
      estimatedSalePriceCents,
      actualSellPriceCents,
      profitCents,
      marginPct,
      qtyPurchased: item.qtyPurchased,
      qtySold,
      qtyUsed,
      qtyRemaining,
      notes: pricing?.notes ?? null,
    };
  });

  rows.sort((a, b) => {
    const dateCompare = b.dateSort.localeCompare(a.dateSort);
    return dateCompare || a.plantName.localeCompare(b.plantName) || a.sku.localeCompare(b.sku);
  });

  return <PlantInventoryClient businessSlug={businessSlug} rows={rows} initialQ={qRaw} />;
}
