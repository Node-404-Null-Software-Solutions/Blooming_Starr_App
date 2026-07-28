import { requireBusinessMembership } from "@/lib/authz";
import {
  buildTaxYearDateWhere,
  parseTaxYear,
} from "@/lib/dashboard";
import { buildRawTransactionsCsv } from "@/lib/raw-transaction-export";
import { createOverheadExpenseRepository } from "@/lib/repositories/overhead-expense";
import { createSalesRepository } from "@/lib/repositories/sales";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ businessSlug: string }>;
  }
) {
  const { businessSlug } = await params;
  const { business, businessContext } =
    await requireBusinessMembership(businessSlug);
  const year = parseTaxYear(
    new URL(request.url).searchParams.get("year") ?? undefined
  );
  const yearWhere = buildTaxYearDateWhere(year);
  const sales = createSalesRepository(businessContext);
  const overheadExpenses = createOverheadExpenseRepository(businessContext);

  const [salesRows, overheadRows] = await Promise.all([
    sales.listForRawExport(yearWhere),
    overheadExpenses.listForRawExport(yearWhere),
  ]);
  const csv = buildRawTransactionsCsv({
    businessName: business.name,
    year,
    sales: salesRows,
    overheadExpenses: overheadRows,
  });

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="raw-transactions-${year}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
