"use client";

import { Download } from "lucide-react";
import type { TaxSummary } from "@/lib/dashboard";
import { centsToDecimal } from "@/lib/formulas";

function buildTaxSummaryCsv(summary: TaxSummary, businessName?: string): string {
  const rows: string[] = [];
  rows.push("Tax Summary");
  if (businessName) rows.push(`Business,${escapeCsv(businessName)}`);
  rows.push(`Year,${summary.year}`);
  rows.push("");
  rows.push("Line,Label,Amount ($),Percent");
  rows.push(`1,Total Revenue,${centsToDecimal(summary.revenueCents)},`);
  rows.push(`2,Plant COGS,${centsToDecimal(summary.plantCogsCents)},`);
  rows.push(`3,Product COGS,${centsToDecimal(summary.productCogsCents)},`);
  rows.push(`4,Total COGS,${centsToDecimal(summary.cogsCents)},`);
  rows.push(`5,Gross Profit,${centsToDecimal(summary.grossProfitCents)},${summary.grossMarginPct.toFixed(1)}%`);
  rows.push("");
  rows.push("Expenses by Category");
  rows.push("Category,Amount ($)");
  for (const row of summary.expensesByCategory) {
    rows.push(`${escapeCsv(row.category)},${centsToDecimal(row.totalCents)}`);
  }
  rows.push(`Total Expenses,${centsToDecimal(summary.totalExpensesCents)}`);
  rows.push("");
  rows.push(`Net Profit,${centsToDecimal(summary.netProfitCents)},${summary.netMarginPct.toFixed(1)}%`);
  return rows.join("\r\n");
}

function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function ExportTaxSummaryButton({
  summary,
  businessName,
}: {
  summary: TaxSummary;
  businessName?: string;
}) {
  function download() {
    const csv = buildTaxSummaryCsv(summary, businessName);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-summary-${summary.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      <Download className="h-4 w-4" aria-hidden />
      Export for accountant (CSV)
    </button>
  );
}
