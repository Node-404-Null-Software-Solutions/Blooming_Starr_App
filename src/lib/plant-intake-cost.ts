function nonNegativeCents(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function positiveQuantity(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

export function plantIntakeTotalCostCents(
  unitCostCents: number,
  quantity: number,
) {
  return nonNegativeCents(unitCostCents) * positiveQuantity(quantity);
}

export function plantIntakeUnitCostCents(
  totalCostCents: number,
  quantity: number,
) {
  return Math.round(
    nonNegativeCents(totalCostCents) / positiveQuantity(quantity),
  );
}

export function resolvePlantIntakeUnitCostCents({
  unitCostCents,
  totalCostCents,
  quantity,
}: {
  unitCostCents?: number;
  totalCostCents?: number;
  quantity: number;
}) {
  if (unitCostCents !== undefined) {
    return nonNegativeCents(unitCostCents);
  }
  if (totalCostCents !== undefined) {
    return plantIntakeUnitCostCents(totalCostCents, quantity);
  }
  return 0;
}
