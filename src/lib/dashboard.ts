import { db } from "@/lib/db";

export type ExpenseByCategory = { category: string; totalCents: number };

export type SalesByMonth = {
  monthLabel: string;
  monthIndex: number;
  revenueCents: number;
  profitCents: number;
};

export type ChannelRevenue = {
  channel: string;
  revenueCents: number;
};

export type GenusCounts = {
  genus: string;
  code: string;
  count: number;
};

export type PlantInventoryStats = {
  availableCount: number;
  soldCount: number;
  deadCount: number;
  damagedCount: number;
  giveawayCount: number;
  donationCount: number;
  totalPlantInvestmentCents: number;
  plantInvestmentAtMsrpCents: number;
  deadLossCents: number;
  damagedLossCents: number;
  giveawayLossCents: number;
  donationLossCents: number;
  totalInventoryLossCents: number;
  genusCounts: GenusCounts[];
};

export type ExpenseSectionEntry = {
  id: string;
  date: string | null;
  vendor: string | null;
  description: string | null;
  totalCents: number;
};

export type ExpenseSection = {
  category: string;
  totalCents: number;
  entries: ExpenseSectionEntry[];
};

export type TaxSummary = {
  year: number;
  revenueCents: number;
  plantCogsCents: number;
  productCogsCents: number;
  cogsCents: number;
  grossProfitCents: number;
  grossMarginPct: number;
  expensesByCategory: ExpenseByCategory[];
  totalExpensesCents: number;
  netProfitCents: number;
  netMarginPct: number;
  totalTransactions: number;
  avgSaleValueCents: number;
  avgProfitPerSaleCents: number;
  channelRevenue: ChannelRevenue[];
  salesByMonth: SalesByMonth[];
  expenseSections: ExpenseSection[];
  plantInventoryStats: PlantInventoryStats;
};

function endOfDay(value: Date) {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildDateWhere(rangeStart: Date | null, rangeEnd?: Date | null) {
  if (!rangeStart && !rangeEnd) return undefined;
  const startClause =
    rangeStart != null
      ? { OR: [{ date: { gte: rangeStart } }, { date: null, createdAt: { gte: rangeStart } }] }
      : null;
  const endClause =
    rangeEnd != null
      ? { OR: [{ date: { lte: rangeEnd } }, { date: null, createdAt: { lte: rangeEnd } }] }
      : null;
  if (startClause && endClause) return { AND: [startClause, endClause] };
  if (startClause) return startClause;
  return endClause ?? undefined;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateOnly(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export async function getTaxSummary(businessId: string, year: number): Promise<TaxSummary> {
  const rangeStart = new Date(year, 0, 1);
  const rangeEnd = endOfDay(new Date(year, 11, 31));
  const rangeWhere = buildDateWhere(rangeStart, rangeEnd);

  const [
    salesEntries,
    overheadByCategory,
    overheadEntries,
    productSkus,
    plantIntakeRows,
  ] = await Promise.all([
    db.salesEntry.findMany({
      where: { businessId, ...(rangeWhere ?? {}) },
      select: {
        date: true,
        createdAt: true,
        sku: true,
        totalSaleCents: true,
        costCents: true,
        profitCents: true,
        channel: true,
      },
      orderBy: { date: "asc" },
    }),
    db.overheadExpense.groupBy({
      by: ["category"],
      where: { businessId, ...(rangeWhere ?? {}) },
      _sum: { totalCents: true },
    }),
    db.overheadExpense.findMany({
      where: { businessId, ...(rangeWhere ?? {}) },
      select: { id: true, date: true, vendor: true, category: true, description: true, totalCents: true },
      orderBy: { date: "asc" },
    }),
    db.productIntake.findMany({
      where: { businessId },
      select: { sku: true },
      distinct: ["sku"],
    }),
    db.plantIntake.findMany({
      where: { businessId, ...(rangeWhere ?? {}) },
      select: { sku: true, status: true, costCents: true, msrpCents: true, qty: true },
    }),
  ]);


  const productSkuSet = new Set(productSkus.map((p) => p.sku));


  let revenueCents = 0;
  let plantCogsCents = 0;
  let productCogsCents = 0;
  const channelMap = new Map<string, number>();
  const monthRevenue = new Array(12).fill(0);
  const monthProfit = new Array(12).fill(0);

  for (const row of salesEntries) {
    const total = row.totalSaleCents ?? 0;
    const cost = row.costCents ?? 0;
    const profit = row.profitCents ?? 0;
    revenueCents += total;

    if (productSkuSet.has(row.sku)) {
      productCogsCents += cost;
    } else {
      plantCogsCents += cost;
    }

    const ch = row.channel?.trim() || "Other";
    channelMap.set(ch, (channelMap.get(ch) ?? 0) + total);

    const d = row.date ?? row.createdAt;
    if (d.getFullYear() === year) {
      const m = d.getMonth();
      monthRevenue[m] += total;
      monthProfit[m] += profit;
    }
  }

  const cogsCents = plantCogsCents + productCogsCents;
  const grossProfitCents = revenueCents - cogsCents;
  const grossMarginPct = revenueCents > 0 ? (grossProfitCents / revenueCents) * 100 : 0;


  type OverheadGroupRow = (typeof overheadByCategory)[number];
  const expensesByCategory: ExpenseByCategory[] = overheadByCategory.map((row: OverheadGroupRow) => ({
    category: row.category?.trim() || "Uncategorized",
    totalCents: row._sum?.totalCents ?? 0,
  }));
  const totalExpensesCents = expensesByCategory.reduce((sum, row) => sum + row.totalCents, 0);
  const netProfitCents = grossProfitCents - totalExpensesCents;
  const netMarginPct = revenueCents > 0 ? (netProfitCents / revenueCents) * 100 : 0;


  const totalTransactions = salesEntries.length;
  const avgSaleValueCents = totalTransactions > 0 ? Math.round(revenueCents / totalTransactions) : 0;
  const avgProfitPerSaleCents = totalTransactions > 0 ? Math.round(netProfitCents / totalTransactions) : 0;


  const channelRevenue: ChannelRevenue[] = Array.from(channelMap.entries())
    .map(([channel, rev]) => ({ channel, revenueCents: rev }))
    .sort((a, b) => b.revenueCents - a.revenueCents);


  const salesByMonth: SalesByMonth[] = MONTH_LABELS.map((label, i) => ({
    monthLabel: `${label} ${year}`,
    monthIndex: i,
    revenueCents: monthRevenue[i],
    profitCents: monthProfit[i],
  }));

  const categoryMap = new Map<string, ExpenseSectionEntry[]>();
  for (const row of overheadEntries) {
    const cat = row.category?.trim() || "Uncategorized";
    const list = categoryMap.get(cat) ?? [];
    list.push({
      id: row.id,
      date: formatDateOnly(row.date),
      vendor: row.vendor ?? null,
      description: row.description ?? null,
      totalCents: row.totalCents ?? 0,
    });
    categoryMap.set(cat, list);
  }
  const expenseSections: ExpenseSection[] = Array.from(categoryMap.entries())
    .map(([category, entries]) => ({
      category,
      totalCents: entries.reduce((s, e) => s + e.totalCents, 0),
      entries,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  let availableCount = 0;
  let soldCount = 0;
  let deadCount = 0;
  let damagedCount = 0;
  let giveawayCount = 0;
  let donationCount = 0;
  let totalPlantInvestmentCents = 0;
  let plantInvestmentAtMsrpCents = 0;
  let deadLossCents = 0;
  let damagedLossCents = 0;
  let giveawayLossCents = 0;
  let donationLossCents = 0;

  for (const p of plantIntakeRows) {
    const status = (p.status ?? "").toLowerCase().trim();
    const qty = p.qty ?? 1;
    const cost = p.costCents ?? 0;
    const msrp = p.msrpCents ?? 0;

    switch (status) {
      case "available":
        availableCount += qty;
        totalPlantInvestmentCents += cost;
        plantInvestmentAtMsrpCents += msrp;
        break;
      case "sold":
        soldCount += qty;
        break;
      case "dead":
        deadCount += qty;
        deadLossCents += cost;
        break;
      case "damaged":
        damagedCount += qty;
        damagedLossCents += cost;
        break;
      case "giveaway":
        giveawayCount += qty;
        giveawayLossCents += cost;
        break;
      case "donation":
        donationCount += qty;
        donationLossCents += cost;
        break;
      default:
        availableCount += qty;
        totalPlantInvestmentCents += cost;
        plantInvestmentAtMsrpCents += msrp;
        break;
    }
  }
  const totalInventoryLossCents = deadLossCents + damagedLossCents + giveawayLossCents + donationLossCents;

  const genusDefinitions: { genus: string; code: string }[] = [
    { genus: "Philodendron", code: "-PH-" },
    { genus: "Hoya", code: "-HO-" },
    { genus: "Alocasia", code: "-AL-" },
    { genus: "Syngonium", code: "-SYN-" },
  ];
  const genusCounts: GenusCounts[] = genusDefinitions.map(({ genus, code }) => {
    let count = 0;
    for (const p of plantIntakeRows) {
      const status = (p.status ?? "").toLowerCase().trim();
      if (status !== "available" && status !== "") continue;
      if (p.sku && p.sku.toUpperCase().includes(code)) {
        count += p.qty ?? 1;
      }
    }
    return { genus, code, count };
  });

  return {
    year,
    revenueCents,
    plantCogsCents,
    productCogsCents,
    cogsCents,
    grossProfitCents,
    grossMarginPct,
    expensesByCategory: expensesByCategory.sort((a, b) => b.totalCents - a.totalCents),
    totalExpensesCents,
    netProfitCents,
    netMarginPct,
    totalTransactions,
    avgSaleValueCents,
    avgProfitPerSaleCents,
    channelRevenue,
    salesByMonth,
    expenseSections,
    plantInventoryStats: {
      availableCount,
      soldCount,
      deadCount,
      damagedCount,
      giveawayCount,
      donationCount,
      totalPlantInvestmentCents,
      plantInvestmentAtMsrpCents,
      deadLossCents,
      damagedLossCents,
      giveawayLossCents,
      donationLossCents,
      totalInventoryLossCents,
      genusCounts,
    },
  };
}

export function parseTaxYear(value: string | string[] | undefined): number {
  const current = Array.isArray(value) ? value[0] : value;
  const parsed = current ? parseInt(String(current), 10) : NaN;
  const currentYear = new Date().getFullYear();
  if (Number.isFinite(parsed) && parsed >= 2000 && parsed <= currentYear + 1) {
    return parsed;
  }
  return currentYear;
}
