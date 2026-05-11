import Link from "next/link";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  getTaxSummary,
  parseTaxYear,
  type SalesByMonth,
  type ExpenseSection,
  type ExpenseSectionEntry,
  type ChannelRevenue,
  type PlantInventoryStats,
  type GenusCounts,
} from "@/lib/dashboard";
import DashboardFilter from "./DashboardFilter";
import ExportTaxSummaryButton from "./ExportTaxSummaryButton";
import { centsToUsd, formatPct } from "@/lib/formulas";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BusinessDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: SearchParams;
}) {
  const { profile } = await requireActiveMembership();
  const { businessSlug } = await params;
  const businessId = profile.activeBusinessId;

  if (!businessId) return null;

  const sp = (await searchParams) ?? {};
  const taxYear = parseTaxYear(sp.taxYear);

  const [business, taxSummary] = await Promise.all([
    db.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    }),
    getTaxSummary(businessId, taxYear),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Tax & business summary for {taxYear}.</p>
          </div>
          <DashboardFilter businessSlug={businessSlug} />
        </div>
      </div>


      <section className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Profit &amp; Loss — {taxYear}</h2>
          <ExportTaxSummaryButton summary={taxSummary} businessName={business?.name} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-amber-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total revenue</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.revenueCents)}</p>
          </div>
          <div className="rounded-md border border-amber-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Plant COGS</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.plantCogsCents)}</p>
          </div>
          <div className="rounded-md border border-amber-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Product COGS</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.productCogsCents)}</p>
          </div>
          <div className="rounded-md border border-amber-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total COGS</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.cogsCents)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-amber-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Gross profit</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.grossProfitCents)}</p>
            <p className="text-xs text-gray-500">Gross margin: {formatPct(taxSummary.grossMarginPct)}</p>
          </div>
          <div className="rounded-md border border-amber-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total overhead</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.totalExpensesCents)}</p>
          </div>
          <div className="rounded-md border border-amber-300 bg-amber-100/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-800">Net profit</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{centsToUsd(taxSummary.netProfitCents)}</p>
            <p className="text-xs text-amber-700">Net margin: {formatPct(taxSummary.netMarginPct)}</p>
          </div>
        </div>
      </section>


      <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Sales — {taxYear}</h2>
          <Link
            href={`/app/${businessSlug}/sales`}
            className="text-sm font-medium text-(--primary) hover:underline"
          >
            View all sales →
          </Link>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total transactions</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{taxSummary.totalTransactions}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Avg sale value</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.avgSaleValueCents)}</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Avg profit per sale</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.avgProfitPerSaleCents)}</p>
          </div>
        </div>

        {taxSummary.channelRevenue.length > 0 && (
          <>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Revenue by channel</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                    <th className="px-3 py-2">Channel</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {taxSummary.channelRevenue.map((row: ChannelRevenue) => (
                    <tr key={row.channel} className="border-t border-gray-100 text-gray-700">
                      <td className="px-3 py-2">{row.channel}</td>
                      <td className="px-3 py-2 text-right font-medium">{centsToUsd(row.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-700">Monthly breakdown</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {taxSummary.salesByMonth.map((row: SalesByMonth) => (
                <tr key={row.monthLabel} className="border-t border-gray-100 text-gray-700">
                  <td className="px-3 py-2">{row.monthLabel}</td>
                  <td className="px-3 py-2 text-right font-medium">{centsToUsd(row.revenueCents)}</td>
                  <td className="px-3 py-2 text-right font-medium">{centsToUsd(row.profitCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


      <section className="rounded-lg border border-green-200 bg-green-50/50 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Plant inventory</h2>
          <Link
            href={`/app/${businessSlug}/plant-intake`}
            className="text-sm font-medium text-(--primary) hover:underline"
          >
            View plant intake →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {([
            ["Available", taxSummary.plantInventoryStats.availableCount],
            ["Sold", taxSummary.plantInventoryStats.soldCount],
            ["Dead", taxSummary.plantInventoryStats.deadCount],
            ["Damaged", taxSummary.plantInventoryStats.damagedCount],
            ["Giveaway", taxSummary.plantInventoryStats.giveawayCount],
            ["Donation", taxSummary.plantInventoryStats.donationCount],
          ] as const).map(([label, count]) => (
            <div key={label} className="rounded-md border border-green-200 bg-white p-3 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-md border border-green-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Plant investment (cost)</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.plantInventoryStats.totalPlantInvestmentCents)}</p>
          </div>
          <div className="rounded-md border border-green-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Investment at MSRP</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{centsToUsd(taxSummary.plantInventoryStats.plantInvestmentAtMsrpCents)}</p>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-red-600">Total inventory loss</p>
            <p className="mt-1 text-xl font-semibold text-red-700">{centsToUsd(taxSummary.plantInventoryStats.totalInventoryLossCents)}</p>
          </div>
        </div>
        {taxSummary.plantInventoryStats.totalInventoryLossCents > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-gray-200 bg-white p-2 text-center">
              <p className="text-xs text-gray-500">Dead</p>
              <p className="text-sm font-medium text-gray-900">{centsToUsd(taxSummary.plantInventoryStats.deadLossCents)}</p>
            </div>
            <div className="rounded-md border border-gray-200 bg-white p-2 text-center">
              <p className="text-xs text-gray-500">Damaged</p>
              <p className="text-sm font-medium text-gray-900">{centsToUsd(taxSummary.plantInventoryStats.damagedLossCents)}</p>
            </div>
            <div className="rounded-md border border-gray-200 bg-white p-2 text-center">
              <p className="text-xs text-gray-500">Giveaway</p>
              <p className="text-sm font-medium text-gray-900">{centsToUsd(taxSummary.plantInventoryStats.giveawayLossCents)}</p>
            </div>
            <div className="rounded-md border border-gray-200 bg-white p-2 text-center">
              <p className="text-xs text-gray-500">Donation</p>
              <p className="text-sm font-medium text-gray-900">{centsToUsd(taxSummary.plantInventoryStats.donationLossCents)}</p>
            </div>
          </div>
        )}
        {taxSummary.plantInventoryStats.genusCounts.some((g: GenusCounts) => g.count > 0) && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Available by genus</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {taxSummary.plantInventoryStats.genusCounts.map((g: GenusCounts) => (
                <div key={g.genus} className="rounded-md border border-green-200 bg-white p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{g.genus}</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{g.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>


      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Expenses by category — {taxYear}</h2>
          <Link
            href={`/app/${businessSlug}/overhead-expenses`}
            className="text-sm font-medium text-(--primary) hover:underline"
          >
            View all expenses →
          </Link>
        </div>

        {taxSummary.expenseSections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
            No expenses recorded for {taxYear}.{" "}
            <Link href={`/app/${businessSlug}/overhead-expenses/new`} className="text-(--primary) hover:underline">
              Add an expense
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {taxSummary.expenseSections.map((section: ExpenseSection) => (
              <div
                key={section.category}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-900">
                  {section.category}
                  <span className="ml-2 font-normal text-gray-600">
                    — {centsToUsd(section.totalCents)} total
                  </span>
                </h3>
                <div className="overflow-x-auto rounded border border-gray-100">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                        <th className="px-2 py-1.5">Date</th>
                        <th className="px-2 py-1.5">Vendor</th>
                        <th className="px-2 py-1.5">Description</th>
                        <th className="px-2 py-1.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.entries.map((entry: ExpenseSectionEntry) => (
                        <tr key={entry.id} className="border-t border-gray-50 text-gray-700">
                          <td className="whitespace-nowrap px-2 py-1.5">{entry.date ?? "—"}</td>
                          <td className="max-w-[120px] truncate px-2 py-1.5" title={entry.vendor ?? undefined}>
                            {entry.vendor ?? "—"}
                          </td>
                          <td className="max-w-[160px] truncate px-2 py-1.5" title={entry.description ?? undefined}>
                            {entry.description ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right font-medium">
                            {centsToUsd(entry.totalCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
