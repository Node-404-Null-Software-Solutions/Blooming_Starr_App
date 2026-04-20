/**
 * App-owned formulas for all modules so the app is the single source of truth
 * instead of relying on client spreadsheet formulas.
 *
 * Covers: Sales, Product Intake, Overhead Expenses, Transplant Log.
 */

// ---------------------------------------------------------------------------
// Currency formatting
// ---------------------------------------------------------------------------

/** "$1,234" — whole-dollar display for dashboard summary tiles. */
export function centsToUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** "$12.34" — two-decimal display for inventory and expense tables. */
export function centsToUsdFixed(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** "12.34" — plain decimal string for CSV export (no currency symbol). */
export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** "1.5%" — percentage string for margin/rate display. */
export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function safeNum(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function safePct(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return (numerator / denominator) * 100;
}

/**
 * Compute total sale, profit, and margin % for a sales entry.
 * - totalSale = qty * salePrice
 * - profit = totalSale - cost
 * - margin = (profit / totalSale) * 100 (margin on revenue); 0 when totalSale is 0.
 */
export function computeSalesDerived(
  qty: number,
  salePriceCents: number,
  costCents: number
): { totalSaleCents: number; profitCents: number; marginPct: number } {
  const q = Math.max(0, Math.floor(safeNum(qty)) || 1);
  const price = safeNum(salePriceCents);
  const cost = safeNum(costCents);

  const totalSaleCents = q * price;
  const profitCents = totalSaleCents - cost;
  const marginPct = safePct(profitCents, totalSaleCents);

  return { totalSaleCents, profitCents, marginPct };
}

/**
 * Compute unit cost for a product intake entry.
 * - unitCost = totalCost / qty; 0 when either is 0.
 */
export function computeProductIntakeUnitCost(
  totalCostCents: number,
  qty: number
): { unitCostCents: number } {
  const total = safeNum(totalCostCents);
  const q = Math.max(0, Math.floor(safeNum(qty)) || 1);
  const unitCostCents = total > 0 && q > 0 ? Math.round(total / q) : 0;
  return { unitCostCents };
}

/**
 * Compute derived values for an overhead expense entry.
 * - unitCost = (subTotal - discount) / qty; 0 when qty is 0.
 * - total = subTotal + shipping - discount.
 */
export function computeOverheadDerived(
  subTotalCents: number,
  shippingCents: number,
  discountCents: number,
  qty: number
): { unitCostCents: number; totalCents: number } {
  const sub = safeNum(subTotalCents);
  const ship = safeNum(shippingCents);
  const disc = safeNum(discountCents);
  const q = Math.max(0, Math.floor(safeNum(qty)) || 1);
  const totalCents = sub + ship - disc;
  const unitCostCents = q > 0 ? Math.round((sub - disc) / q) : 0;
  return { unitCostCents, totalCents };
}

/**
 * Compute cost per division when splitting a plant.
 * - costCents = originalCost / totalParts; 0 when original cost is 0.
 */
export function computeDivisionCost(
  originalCostCents: number,
  totalParts: number
): { costCents: number } {
  const cost = safeNum(originalCostCents);
  const parts = Math.max(1, Math.floor(safeNum(totalParts)));
  const costCents = cost > 0 ? Math.round(cost / parts) : 0;
  return { costCents };
}
