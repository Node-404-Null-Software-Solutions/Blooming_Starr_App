import { requireRole } from "@/lib/authz";

export default async function FormulasPage() {
  await requireRole(["OWNER", "MANAGER"]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Formulas Reference</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every formula used in the app for calculations. Values are stored in cents; margins are percentages.
        </p>
      </div>

      <div className="space-y-8">
        <div className="rounded-md border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-800">Sales module</h3>
          <p className="mt-1 text-xs text-gray-500">
            Used when creating/editing sales entries and when syncing from product master.
          </p>
          <ul className="mt-3 space-y-2 rounded-md bg-gray-50 p-4 text-sm">
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Total sale (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">qty × salePrice</code>
              <span className="text-gray-500">Quantity times sale price per unit (cents). Qty is floored and at least 1.</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Profit (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">totalSale − cost</code>
              <span className="text-gray-500">Total sale minus cost (all in cents).</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Margin %</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">(profit ÷ totalSale) × 100</code>
              <span className="text-gray-500">Margin on revenue. Zero when total sale is 0.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-800">Product intake module</h3>
          <p className="mt-1 text-xs text-gray-500">Used when adding a product intake entry (unit cost derived from total).</p>
          <ul className="mt-3 space-y-2 rounded-md bg-gray-50 p-4 text-sm">
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Unit cost (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">totalCost ÷ qty</code>
              <span className="text-gray-500">Total cost (cents) divided by quantity. Zero if qty or total cost is 0.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-800">Overhead expenses module</h3>
          <p className="mt-1 text-xs text-gray-500">Used when adding an overhead expense (unit cost and actual total).</p>
          <ul className="mt-3 space-y-2 rounded-md bg-gray-50 p-4 text-sm">
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Unit cost (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">(subTotal − discount) ÷ qty</code>
              <span className="text-gray-500">Subtotal minus discount (cents), divided by quantity. Zero if qty is 0.</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Actual total (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">subTotal + shipping − discount</code>
              <span className="text-gray-500">Subtotal plus shipping minus discount (all in cents).</span>
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-800">Transplant log module</h3>
          <p className="mt-1 text-xs text-gray-500">Used when logging a division to auto-calculate cost per part.</p>
          <ul className="mt-3 space-y-2 rounded-md bg-gray-50 p-4 text-sm">
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Division cost (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">originalCost ÷ totalParts</code>
              <span className="text-gray-500">
                Original plant cost divided by total parts (original + existing divisions + new division). Only applies when action contains &quot;division&quot; and cost is left at 0.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-800">Dashboard KPIs</h3>
          <p className="mt-1 text-xs text-gray-500">Aggregated from stored sales and expense data for the selected year.</p>
          <ul className="mt-3 space-y-2 rounded-md bg-gray-50 p-4 text-sm">
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Gross profit (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">revenue − COGS</code>
              <span className="text-gray-500">Total revenue minus total cost of goods sold (plant + product costs).</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Gross margin %</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">(grossProfit ÷ revenue) × 100</code>
              <span className="text-gray-500">Gross profit as a percentage of revenue. Zero when revenue is 0.</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Net profit (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">grossProfit − totalExpenses</code>
              <span className="text-gray-500">Gross profit minus all overhead expenses.</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Net margin %</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">(netProfit ÷ revenue) × 100</code>
              <span className="text-gray-500">Net profit as a percentage of revenue. Zero when revenue is 0.</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Avg sale value (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">revenue ÷ totalTransactions</code>
              <span className="text-gray-500">Average revenue per sale. Zero when there are no transactions.</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-700">Avg profit per sale (¢)</span>
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-800">netProfit ÷ totalTransactions</code>
              <span className="text-gray-500">Average net profit per sale. Zero when there are no transactions.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
