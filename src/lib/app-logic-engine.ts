import { db } from "@/lib/db";

type RuleModule =
  | "sales"
  | "productIntake"
  | "overheadExpenses"
  | "transplantLog";

type RuleTrigger = "beforeSave";

type LogicRule = {
  name: string;
  module: RuleModule;
  trigger: RuleTrigger;
  mode: "FORMULA" | "SCRIPT";
  expression: string;
  notes: string;
  enabled: boolean;
  sortOrder: number;
};

const DEFAULT_RULES: LogicRule[] = [
  {
    name: "Sales totals",
    module: "sales",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: [
      "qty = max(1, floor(qty))",
      "totalSaleCents = qty * salePriceCents",
      "profitCents = totalSaleCents - costCents",
      "marginPct = totalSaleCents > 0 ? (profitCents / totalSaleCents) * 100 : 0",
    ].join("\n"),
    notes: "Calculates total sale, profit, and margin from quantity, sale price, and cost.",
    enabled: true,
    sortOrder: 0,
  },
  {
    name: "Product intake unit cost",
    module: "productIntake",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression:
      "unitCostCents = totalCostCents > 0 && qty > 0 ? round(totalCostCents / qty) : 0",
    notes: "Calculates unit cost from total product cost and quantity.",
    enabled: true,
    sortOrder: 1,
  },
  {
    name: "Overhead totals",
    module: "overheadExpenses",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: [
      "totalCents = subTotalCents + shippingCents - discountCents",
      "unitCostCents = qty > 0 ? round((subTotalCents - discountCents) / qty) : 0",
    ].join("\n"),
    notes: "Calculates actual total and unit cost for overhead expense rows.",
    enabled: true,
    sortOrder: 2,
  },
  {
    name: "Division cost",
    module: "transplantLog",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression:
      "costCents = originalCostCents > 0 ? round(originalCostCents / max(1, totalParts)) : 0",
    notes: "Calculates cost per division when a transplant action splits a plant.",
    enabled: true,
    sortOrder: 3,
  },
];

const HELPERS = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  max: Math.max,
  min: Math.min,
  round: Math.round,
};

const FORBIDDEN_TOKENS =
  /\b(?:constructor|document|eval|fetch|Function|global|globalThis|import|process|prototype|require|window)\b|__proto__/;

const SAMPLE_SCOPES: Record<RuleModule, Record<string, number>> = {
  sales: {
    qty: 2,
    salePriceCents: 1500,
    costCents: 700,
  },
  productIntake: {
    totalCostCents: 4800,
    qty: 12,
  },
  overheadExpenses: {
    subTotalCents: 12000,
    shippingCents: 1500,
    discountCents: 500,
    qty: 4,
  },
  transplantLog: {
    originalCostCents: 3000,
    totalParts: 3,
  },
};

function normalizeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function ensureDefaultAppLogicRules(businessId: string) {
  const count = await db.appLogicRule.count({ where: { businessId } });
  if (count > 0) return;

  await db.appLogicRule.createMany({
    data: DEFAULT_RULES.map((rule) => ({
      businessId,
      ...rule,
    })),
  });
}

function assertSafeExpression(expression: string) {
  if (!/^[A-Za-z0-9_$\s+\-*/%().,<>=!?:&|]+$/.test(expression)) {
    throw new Error("Only numbers, fields, math operators, comparisons, and helper functions are allowed.");
  }
  if (/\.[A-Za-z_$]/.test(expression)) {
    throw new Error("Property access is not allowed in app logic formulas.");
  }
  if (FORBIDDEN_TOKENS.test(expression)) {
    throw new Error("This formula uses a blocked keyword.");
  }
}

function evaluateExpression(expression: string, scope: Record<string, number>): number {
  assertSafeExpression(expression);

  const values = { ...HELPERS, ...scope };
  const names = Object.keys(values);
  const args = Object.values(values);
  const evaluator = new Function(
    ...names,
    `"use strict"; return (${expression});`
  );
  return normalizeNumber(evaluator(...args));
}

function applyFormula(
  expression: string,
  input: Record<string, number>
): Record<string, number> {
  const scope = { ...input };
  const lines = expression
    .split(/[\n;]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith("//"));

  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
    if (!match) {
      throw new Error(`Invalid app logic line: ${line}`);
    }

    const [, field, formula] = match;
    scope[field] = evaluateExpression(formula, scope);
  }

  return scope;
}

export function validateAppLogicExpression(
  module: string,
  expression: string
): { ok: true } | { ok: false; error: string } {
  const sample = SAMPLE_SCOPES[module as RuleModule];
  if (!sample) return { ok: true };

  try {
    applyFormula(expression, sample);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid formula.",
    };
  }
}

export async function loadAppLogicRunner(
  businessId: string,
  module: RuleModule,
  trigger: RuleTrigger
) {
  await ensureDefaultAppLogicRules(businessId);

  const rules = await db.appLogicRule.findMany({
    where: {
      businessId,
      module,
      trigger,
      enabled: true,
    },
    select: { expression: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (input: Record<string, number>) => {
    let scope = { ...input };
    for (const rule of rules) {
      scope = applyFormula(rule.expression, scope);
    }
    return scope;
  };
}

function pickInt(scope: Record<string, number>, key: string): number {
  return Math.round(normalizeNumber(scope[key]));
}

function pickFloat(scope: Record<string, number>, key: string): number {
  return normalizeNumber(scope[key]);
}

export async function loadSalesDerivedCalculator(businessId: string) {
  const runLogic = await loadAppLogicRunner(businessId, "sales", "beforeSave");

  return (input: {
    qty: number;
    salePriceCents: number;
    costCents: number;
  }) => {
    const scope = runLogic({
      qty: normalizeNumber(input.qty),
      salePriceCents: normalizeNumber(input.salePriceCents),
      costCents: normalizeNumber(input.costCents),
    });

    return {
      totalSaleCents: pickInt(scope, "totalSaleCents"),
      profitCents: pickInt(scope, "profitCents"),
      marginPct: pickFloat(scope, "marginPct"),
    };
  };
}

export async function calculateSalesDerived(
  businessId: string,
  qty: number,
  salePriceCents: number,
  costCents: number
) {
  const calculate = await loadSalesDerivedCalculator(businessId);
  return calculate({ qty, salePriceCents, costCents });
}

export async function calculateProductIntakeDerived(
  businessId: string,
  totalCostCents: number,
  qty: number
) {
  const calculate = await loadProductIntakeDerivedCalculator(businessId);
  return calculate({ totalCostCents, qty });
}

export async function loadProductIntakeDerivedCalculator(businessId: string) {
  const runLogic = await loadAppLogicRunner(
    businessId,
    "productIntake",
    "beforeSave"
  );

  return (input: { totalCostCents: number; qty: number }) => {
    const scope = runLogic({
      totalCostCents: normalizeNumber(input.totalCostCents),
      qty: normalizeNumber(input.qty),
    });

    return { unitCostCents: pickInt(scope, "unitCostCents") };
  };
}

export async function calculateOverheadDerived(
  businessId: string,
  subTotalCents: number,
  shippingCents: number,
  discountCents: number,
  qty: number
) {
  const calculate = await loadOverheadDerivedCalculator(businessId);
  return calculate({ subTotalCents, shippingCents, discountCents, qty });
}

export async function loadOverheadDerivedCalculator(businessId: string) {
  const runLogic = await loadAppLogicRunner(
    businessId,
    "overheadExpenses",
    "beforeSave"
  );

  return (input: {
    subTotalCents: number;
    shippingCents: number;
    discountCents: number;
    qty: number;
  }) => {
    const scope = runLogic({
      subTotalCents: normalizeNumber(input.subTotalCents),
      shippingCents: normalizeNumber(input.shippingCents),
      discountCents: normalizeNumber(input.discountCents),
      qty: normalizeNumber(input.qty),
    });

    return {
      unitCostCents: pickInt(scope, "unitCostCents"),
      totalCents: pickInt(scope, "totalCents"),
    };
  };
}

export async function calculateDivisionCost(
  businessId: string,
  originalCostCents: number,
  totalParts: number
) {
  const runLogic = await loadAppLogicRunner(
    businessId,
    "transplantLog",
    "beforeSave"
  );
  const scope = runLogic({
    originalCostCents: normalizeNumber(originalCostCents),
    totalParts: normalizeNumber(totalParts),
  });

  return { costCents: pickInt(scope, "costCents") };
}
