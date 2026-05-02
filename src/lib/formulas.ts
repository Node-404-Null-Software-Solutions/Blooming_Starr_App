/**
 * Display formatting helpers. Business calculation rules live in App Logic.
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

