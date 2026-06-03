import Link from "next/link";
import { ChevronDown, ChevronRight, ImageIcon, ListFilter, Pencil, CheckSquare } from "lucide-react";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { centsToUsdFixed as money } from "@/lib/formulas";
import { formatAppDate } from "@/lib/date-format";

type InventoryRow = {
  sku: string;
  date: string | null;
  dateSort: string;
  plantName: string;
  status: string;
  plantCostCents: number;
  otherCostCents: number;
  totalCostCents: number;
  plantMsrpCents: number;
  otherMsrpCents: number;
  totalMsrpCents: number;
  estimatedSalePriceCents: number;
  actualSellPriceCents: number;
  profitCents: number;
  marginPct: number | null;
  qtyPurchased: number;
  qtySold: number;
  qtyUsed: number;
  qtyRemaining: number;
  notes: string | null;
};

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

function pct(value: number | null) {
  return value == null ? "" : `${value.toFixed(2)}%`;
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
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

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

  let rows: InventoryRow[] = Array.from(intakeMap.values()).map((item) => {
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

  if (qRaw) {
    const q = qRaw.toLowerCase();
    rows = rows.filter((row) =>
      [
        row.date,
        row.plantName,
        row.sku,
        row.status,
        row.notes ?? "",
      ].some((value) => (value ?? "").toLowerCase().includes(q))
    );
  }

  rows.sort((a, b) => {
    const dateCompare = b.dateSort.localeCompare(a.dateSort);
    return dateCompare || a.plantName.localeCompare(b.plantName) || a.sku.localeCompare(b.sku);
  });

  const headCell =
    "sticky top-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-800";
  const bodyCell =
    "border-b border-r border-gray-200 px-3 py-1.5 align-middle text-xs text-gray-700";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="flex h-12 items-center justify-between px-4">
          <h1 className="text-base font-normal text-gray-800">Plant Inventory</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100"
              aria-label="Filter"
            >
              <ListFilter className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100"
              aria-label="Select rows"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100"
              aria-label="Edit rows"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="m-4 rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1880px] border-collapse bg-white">
            <thead>
              <tr>
                <th className={`${headCell} w-24`}>
                  <span className="inline-flex items-center gap-1">
                    Date <ChevronDown className="h-3 w-3" />
                  </span>
                </th>
                <th className={`${headCell} w-44`}>Plant Name</th>
                <th className={`${headCell} w-32`}>SKU</th>
                <th className={`${headCell} w-28`}>Status</th>
                <th className={`${headCell} w-24`}>Plant Cost</th>
                <th className={`${headCell} w-24`}>Other Cost</th>
                <th className={`${headCell} w-24`}>Total Cost</th>
                <th className={`${headCell} w-24`}>Plant MSRP</th>
                <th className={`${headCell} w-24`}>Other MSRP</th>
                <th className={`${headCell} w-24`}>Total MSRP</th>
                <th className={`${headCell} w-28`}>Est. Sale Price</th>
                <th className={`${headCell} w-28`}>Act. Sell Price</th>
                <th className={`${headCell} w-24`}>Profit</th>
                <th className={`${headCell} w-24`}>Margin</th>
                <th className={`${headCell} w-28`}>QTY Purchased...</th>
                <th className={`${headCell} w-24`}>QTY Sold</th>
                <th className={`${headCell} w-24`}>QTY Used</th>
                <th className={`${headCell} w-32`}>QTY Remaining...</th>
                <th className={`${headCell} w-20`}>Photo</th>
                <th className={`${headCell} w-44`}>Notes</th>
                <th
                  className="sticky top-0 z-10 w-8 border-b border-gray-200 bg-white px-2 py-2"
                  aria-label="Open row"
                />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sku} className="h-9 hover:bg-green-50/50">
                  <td className={`${bodyCell} whitespace-nowrap`}>{row.date}</td>
                  <td className={`${bodyCell} max-w-44 truncate`} title={row.plantName}>
                    {row.plantName}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap font-mono`}>{row.sku}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{row.status}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{money(row.plantCostCents)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{money(row.otherCostCents)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{money(row.totalCostCents)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{money(row.plantMsrpCents)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{money(row.otherMsrpCents)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{money(row.totalMsrpCents)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>
                    {row.estimatedSalePriceCents ? money(row.estimatedSalePriceCents) : ""}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap`}>
                    {row.actualSellPriceCents ? money(row.actualSellPriceCents) : ""}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{money(row.profitCents)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{pct(row.marginPct)}</td>
                  <td className={`${bodyCell} text-center`}>{row.qtyPurchased}</td>
                  <td className={`${bodyCell} text-center`}>{row.qtySold}</td>
                  <td className={`${bodyCell} text-center`}>{row.qtyUsed}</td>
                  <td className={`${bodyCell} text-center`}>{row.qtyRemaining}</td>
                  <td className={`${bodyCell} text-center`}>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-gray-100 text-gray-400">
                      <ImageIcon className="h-3.5 w-3.5" />
                    </span>
                  </td>
                  <td className={`${bodyCell} max-w-44 truncate`} title={row.notes ?? ""}>
                    {row.notes ?? ""}
                  </td>
                  <td className="border-b border-gray-200 px-2 py-1.5 text-gray-900">
                    <ChevronRight className="h-4 w-4" />
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
