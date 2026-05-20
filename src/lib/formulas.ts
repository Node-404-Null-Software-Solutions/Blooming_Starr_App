export function centsToUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function centsToUsdFixed(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

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

export function computeProductIntakeUnitCost(
  totalCostCents: number,
  qty: number
): { unitCostCents: number } {
  const total = safeNum(totalCostCents);
  const q = Math.max(0, Math.floor(safeNum(qty)) || 1);
  const unitCostCents = total > 0 && q > 0 ? Math.round(total / q) : 0;
  return { unitCostCents };
}

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

export function computeDivisionCost(
  originalCostCents: number,
  totalParts: number
): { costCents: number } {
  const cost = safeNum(originalCostCents);
  const parts = Math.max(1, Math.floor(safeNum(totalParts)));
  const costCents = cost > 0 ? Math.round(cost / parts) : 0;
  return { costCents };
}
