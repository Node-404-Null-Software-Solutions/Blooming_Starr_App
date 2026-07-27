import type { BusinessContext } from "@/lib/business-context";
import {
  isAppLogicMode,
  validateAppLogicRuleContract,
} from "@/lib/app-logic-contract";
import type {
  AppLogicMode,
  AppLogicTrigger,
  ExecutableAppLogicModule,
} from "@/lib/app-logic-contract";
import {
  AppLogicRuntimeError,
  compileAppLogicProgram,
  executeAppLogicProgramDetailed,
} from "@/lib/app-logic-runtime";
import type { AppLogicActionIntent } from "@/lib/app-logic-runtime";
import { createAppLogicRuleRepository } from "@/lib/repositories/app-logic-rule";

type LogicRule = {
  name: string;
  module: ExecutableAppLogicModule;
  trigger: AppLogicTrigger;
  mode: AppLogicMode;
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

function normalizeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function ensureDefaultAppLogicRules(context: BusinessContext) {
  const rules = createAppLogicRuleRepository(context);
  const count = await rules.countAll();
  if (count > 0) return;

  await rules.createMany(DEFAULT_RULES);
}

export type GovernedAppLogicActionIntent = AppLogicActionIntent & {
  ruleId: string;
  ruleName: string;
  module: ExecutableAppLogicModule;
  trigger: AppLogicTrigger;
};

export const APP_LOGIC_EXECUTION_LIMITS = Object.freeze({
  maxRulesPerTrigger: 25,
  maxStatementsPerTrigger: 250,
  maxActionsPerTrigger: 10,
});

export type AppLogicExecutionAudit = {
  ruleId: string;
  ruleName: string;
  module: ExecutableAppLogicModule;
  trigger: AppLogicTrigger;
  mode: AppLogicMode;
  status: "FAILED" | "SUCCEEDED";
  durationMs: number;
  statementCount: number;
  actionCount: number;
  errorCode?: string;
  errorMessage?: string;
};

export class AppLogicExecutionFailure extends AppLogicRuntimeError {
  readonly executions: AppLogicExecutionAudit[];

  constructor(
    code: AppLogicRuntimeError["code"],
    message: string,
    executions: AppLogicExecutionAudit[]
  ) {
    super(code, message);
    this.name = "AppLogicExecutionFailure";
    this.executions = executions;
  }
}

export type AppLogicRunnerResult = {
  scope: Record<string, number>;
  actions: GovernedAppLogicActionIntent[];
  executions: AppLogicExecutionAudit[];
};

export async function loadDetailedAppLogicRunner(
  context: BusinessContext,
  module: ExecutableAppLogicModule,
  trigger: AppLogicTrigger
) {
  await ensureDefaultAppLogicRules(context);
  const appLogicRules = createAppLogicRuleRepository(context);

  const rules = await appLogicRules.listEnabled(module, trigger);
  if (rules.length > APP_LOGIC_EXECUTION_LIMITS.maxRulesPerTrigger) {
    throw new AppLogicRuntimeError(
      "LIMIT",
      `${module}.${trigger} exceeds ${APP_LOGIC_EXECUTION_LIMITS.maxRulesPerTrigger} active rules.`
    );
  }
  const programs = rules.map((rule) => {
    if (!isAppLogicMode(rule.mode)) {
      throw new Error(
        `Active app logic rule "${rule.name}" has an invalid stored mode.`
      );
    }
    const validation = validateAppLogicRuleContract({
      module,
      trigger,
      mode: rule.mode,
      expression: rule.expression,
      enabled: true,
    });
    if (!validation.ok) {
      throw new Error(
        `Active app logic rule "${rule.name}" is invalid: ${validation.error}`
      );
    }
    if (!validation.program) {
      throw new Error(
        `Active app logic rule "${rule.name}" has no executable program.`
      );
    }
    try {
      return {
        id: rule.id,
        name: rule.name,
        mode: rule.mode,
        program: compileAppLogicProgram(validation.program),
      };
    } catch (error) {
      throw new Error(
        `Active app logic rule "${rule.name}" is invalid: ${
          error instanceof Error ? error.message : "Compilation failed."
        }`
      );
    }
  });
  const totalStatements = programs.reduce(
    (total, rule) => total + rule.program.statements.length,
    0
  );
  if (totalStatements > APP_LOGIC_EXECUTION_LIMITS.maxStatementsPerTrigger) {
    throw new AppLogicRuntimeError(
      "LIMIT",
      `${module}.${trigger} exceeds ${APP_LOGIC_EXECUTION_LIMITS.maxStatementsPerTrigger} total statements.`
    );
  }

  return (input: Record<string, number>): AppLogicRunnerResult => {
    let scope = { ...input };
    const actions: GovernedAppLogicActionIntent[] = [];
    const executions: AppLogicExecutionAudit[] = [];
    for (const rule of programs) {
      const startedAt = Date.now();
      try {
        const result = executeAppLogicProgramDetailed(rule.program, scope);
        if (
          actions.length + result.actions.length >
          APP_LOGIC_EXECUTION_LIMITS.maxActionsPerTrigger
        ) {
          throw new AppLogicRuntimeError(
            "LIMIT",
            `Trigger exceeds ${APP_LOGIC_EXECUTION_LIMITS.maxActionsPerTrigger} governed actions.`
          );
        }
        scope = result.scope;
        actions.push(
          ...result.actions.map((action) => ({
            ...action,
            ruleId: rule.id,
            ruleName: rule.name,
            module,
            trigger,
          }))
        );
        executions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          module,
          trigger,
          mode: rule.mode,
          status: "SUCCEEDED",
          durationMs: Math.max(0, Date.now() - startedAt),
          statementCount: rule.program.statements.length,
          actionCount: result.actions.length,
        });
      } catch (error) {
        const runtimeError =
          error instanceof AppLogicRuntimeError
            ? error
            : new AppLogicRuntimeError(
                "TYPE",
                error instanceof Error ? error.message : "Unknown runtime failure."
              );
        const message = `Rule "${rule.name}": ${runtimeError.message}`;
        executions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          module,
          trigger,
          mode: rule.mode,
          status: "FAILED",
          durationMs: Math.max(0, Date.now() - startedAt),
          statementCount: rule.program.statements.length,
          actionCount: 0,
          errorCode: runtimeError.code,
          errorMessage: runtimeError.message,
        });
        throw new AppLogicExecutionFailure(
          runtimeError.code,
          message,
          executions
        );
      }
    }
    return { scope, actions, executions };
  };
}

export async function loadAppLogicRunner(
  context: BusinessContext,
  module: ExecutableAppLogicModule,
  trigger: AppLogicTrigger
) {
  const runDetailed = await loadDetailedAppLogicRunner(
    context,
    module,
    trigger
  );
  return (input: Record<string, number>) => runDetailed(input).scope;
}

function pickInt(scope: Record<string, number>, key: string): number {
  return Math.round(normalizeNumber(scope[key]));
}

function pickFloat(scope: Record<string, number>, key: string): number {
  return normalizeNumber(scope[key]);
}

export async function loadSalesDerivedCalculator(context: BusinessContext) {
  const runLogic = await loadAppLogicRunner(context, "sales", "beforeSave");

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
  context: BusinessContext,
  qty: number,
  salePriceCents: number,
  costCents: number
) {
  const calculate = await loadSalesDerivedCalculator(context);
  return calculate({ qty, salePriceCents, costCents });
}

export async function calculateProductIntakeDerived(
  context: BusinessContext,
  totalCostCents: number,
  qty: number
) {
  const calculate = await loadProductIntakeDerivedCalculator(context);
  return calculate({ totalCostCents, qty });
}

export async function loadProductIntakeDerivedCalculator(context: BusinessContext) {
  const runLogic = await loadAppLogicRunner(
    context,
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
  context: BusinessContext,
  subTotalCents: number,
  shippingCents: number,
  discountCents: number,
  qty: number
) {
  const calculate = await loadOverheadDerivedCalculator(context);
  return calculate({ subTotalCents, shippingCents, discountCents, qty });
}

export async function loadOverheadDerivedCalculator(context: BusinessContext) {
  const runLogic = await loadAppLogicRunner(
    context,
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
  context: BusinessContext,
  originalCostCents: number,
  totalParts: number
) {
  const runLogic = await loadAppLogicRunner(
    context,
    "transplantLog",
    "beforeSave"
  );
  const scope = runLogic({
    originalCostCents: normalizeNumber(originalCostCents),
    totalParts: normalizeNumber(totalParts),
  });

  return { costCents: pickInt(scope, "costCents") };
}
