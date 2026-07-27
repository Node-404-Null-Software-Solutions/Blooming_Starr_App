export const APP_LOGIC_MODULES = [
  {
    value: "plantIntake",
    label: "Plant Intake",
    available: true,
  },
  { value: "productIntake", label: "Product Intake", available: true },
  { value: "sales", label: "Sales", available: true },
  {
    value: "overheadExpenses",
    label: "Overhead Expenses",
    available: true,
  },
  { value: "transplantLog", label: "Transplant Log", available: true },
  {
    value: "treatmentTracking",
    label: "Treatment Tracking",
    available: true,
  },
  {
    value: "fertilizerLog",
    label: "Fertilizer Log",
    available: true,
  },
  {
    value: "schedule",
    label: "Schedule",
    available: true,
  },
] as const;

export const APP_LOGIC_TRIGGERS = [
  { value: "beforeSave", label: "Before Save", available: true },
  { value: "afterSave", label: "After Save", available: true },
  { value: "afterImport", label: "After Import", available: true },
  { value: "manual", label: "Manual", available: true },
] as const;

export const APP_LOGIC_MODES = [
  { value: "FORMULA", label: "Formula", available: true },
  { value: "SCRIPT", label: "Script", available: true },
] as const;

export type AppLogicModule = (typeof APP_LOGIC_MODULES)[number]["value"];
export type AppLogicTrigger = (typeof APP_LOGIC_TRIGGERS)[number]["value"];
export type AppLogicMode = (typeof APP_LOGIC_MODES)[number]["value"];

export type ExecutableAppLogicModule =
  | "plantIntake"
  | "sales"
  | "productIntake"
  | "overheadExpenses"
  | "transplantLog"
  | "treatmentTracking"
  | "fertilizerLog"
  | "schedule";

export type ExecutableModuleContract = {
  readableFields: readonly string[];
  writableFields: readonly string[];
  sampleScope: Readonly<Record<string, number>>;
};

export const APP_LOGIC_EXECUTABLE_MODULE_CONTRACTS = {
  plantIntake: {
    readableFields: ["qty", "costCents", "msrpCents"],
    writableFields: ["qty", "costCents", "msrpCents"],
    sampleScope: { qty: 4, costCents: 1200, msrpCents: 0 },
  },
  sales: {
    readableFields: [
      "qty",
      "salePriceCents",
      "costCents",
      "totalSaleCents",
      "profitCents",
      "marginPct",
    ],
    writableFields: ["qty", "totalSaleCents", "profitCents", "marginPct"],
    sampleScope: {
      qty: 2,
      salePriceCents: 1500,
      costCents: 700,
      totalSaleCents: 0,
      profitCents: 0,
      marginPct: 0,
    },
  },
  productIntake: {
    readableFields: ["totalCostCents", "qty", "unitCostCents"],
    writableFields: ["unitCostCents"],
    sampleScope: { totalCostCents: 4800, qty: 12, unitCostCents: 0 },
  },
  overheadExpenses: {
    readableFields: [
      "subTotalCents",
      "shippingCents",
      "discountCents",
      "qty",
      "unitCostCents",
      "totalCents",
    ],
    writableFields: ["unitCostCents", "totalCents"],
    sampleScope: {
      subTotalCents: 12000,
      shippingCents: 1500,
      discountCents: 500,
      qty: 4,
      unitCostCents: 0,
      totalCents: 0,
    },
  },
  transplantLog: {
    readableFields: ["originalCostCents", "totalParts", "costCents"],
    writableFields: ["costCents"],
    sampleScope: { originalCostCents: 3000, totalParts: 3, costCents: 0 },
  },
  treatmentTracking: {
    readableFields: [
      "dateEpochDays",
      "nextEarliestEpochDays",
      "nextLatestEpochDays",
    ],
    writableFields: [
      "dateEpochDays",
      "nextEarliestEpochDays",
      "nextLatestEpochDays",
    ],
    sampleScope: {
      dateEpochDays: 20661,
      nextEarliestEpochDays: 20668,
      nextLatestEpochDays: 20675,
    },
  },
  fertilizerLog: {
    readableFields: [
      "dateEpochDays",
      "nextEarliestEpochDays",
      "nextLatestEpochDays",
    ],
    writableFields: [
      "dateEpochDays",
      "nextEarliestEpochDays",
      "nextLatestEpochDays",
    ],
    sampleScope: {
      dateEpochDays: 20661,
      nextEarliestEpochDays: 20691,
      nextLatestEpochDays: 20721,
    },
  },
  schedule: {
    readableFields: ["dateEpochDays", "startMinutes", "endMinutes"],
    writableFields: ["dateEpochDays", "startMinutes", "endMinutes"],
    sampleScope: {
      dateEpochDays: 20661,
      startMinutes: 540,
      endMinutes: 1020,
    },
  },
} as const satisfies Record<ExecutableAppLogicModule, ExecutableModuleContract>;

export const APP_LOGIC_MODULE_TRIGGERS = {
  plantIntake: ["beforeSave", "afterSave", "afterImport", "manual"],
  sales: ["beforeSave", "afterSave", "afterImport", "manual"],
  productIntake: ["beforeSave", "afterSave", "afterImport", "manual"],
  overheadExpenses: ["beforeSave", "afterSave", "afterImport", "manual"],
  transplantLog: ["beforeSave"],
  treatmentTracking: ["beforeSave", "afterSave", "afterImport", "manual"],
  fertilizerLog: ["beforeSave", "afterSave", "afterImport", "manual"],
  schedule: ["beforeSave", "afterSave", "manual"],
} as const satisfies Record<ExecutableAppLogicModule, readonly AppLogicTrigger[]>;

export const APP_LOGIC_HELPERS = [
  "abs",
  "ceil",
  "floor",
  "max",
  "min",
  "round",
] as const;

export const APP_LOGIC_ACTIONS = ["SYNC_PRODUCT_MASTER"] as const;
export type AppLogicActionName = (typeof APP_LOGIC_ACTIONS)[number];

export const APP_LOGIC_MODULE_ACTIONS = {
  plantIntake: ["SYNC_PRODUCT_MASTER"],
  sales: ["SYNC_PRODUCT_MASTER"],
  productIntake: ["SYNC_PRODUCT_MASTER"],
  overheadExpenses: [],
  transplantLog: [],
  treatmentTracking: [],
  fertilizerLog: [],
  schedule: [],
} as const satisfies Record<
  ExecutableAppLogicModule,
  readonly AppLogicActionName[]
>;

export const APP_LOGIC_ACTION_TRIGGERS = ["afterSave", "manual"] as const;

export type AppLogicStatement =
  | {
      kind: "set";
      field: string;
      expression: string;
      line: number;
    }
  | {
      kind: "require";
      expression: string;
      line: number;
    }
  | {
      kind: "action";
      action: AppLogicActionName;
      line: number;
    };

export type AppLogicProgram = {
  module: ExecutableAppLogicModule;
  mode: AppLogicMode;
  statements: AppLogicStatement[];
};

export type AppLogicRuleContractInput = {
  module: AppLogicModule;
  trigger: AppLogicTrigger;
  mode: AppLogicMode;
  expression: string;
  enabled: boolean;
};

export type AppLogicContractResult =
  | { ok: true; program: AppLogicProgram | null }
  | { ok: false; error: string };

const FORBIDDEN_TOKENS =
  /\b(?:constructor|document|eval|fetch|function|global|globalThis|import|process|prototype|require|window)\b|__proto__/i;
const SAFE_EXPRESSION = /^[A-Za-z0-9_$\s+\-*/%().,<>=!?:&|]+$/;
const IDENTIFIER = /[A-Za-z_$][A-Za-z0-9_$]*/g;
const MAX_STATEMENTS = 100;

export function isAppLogicModule(value: string): value is AppLogicModule {
  return APP_LOGIC_MODULES.some((item) => item.value === value);
}

export function isAppLogicTrigger(value: string): value is AppLogicTrigger {
  return APP_LOGIC_TRIGGERS.some((item) => item.value === value);
}

export function isAppLogicMode(value: string): value is AppLogicMode {
  return APP_LOGIC_MODES.some((item) => item.value === value);
}

export function isExecutableAppLogicModule(
  value: AppLogicModule
): value is ExecutableAppLogicModule {
  return Object.hasOwn(APP_LOGIC_EXECUTABLE_MODULE_CONTRACTS, value);
}

export function isExecutableAppLogicSelection(
  module: string,
  trigger: string,
  mode: string
): boolean {
  return (
    isAppLogicModule(module) &&
    isExecutableAppLogicModule(module) &&
    isAppLogicTrigger(trigger) &&
    APP_LOGIC_MODULE_TRIGGERS[module].some(
      (availableTrigger) => availableTrigger === trigger
    ) &&
    (mode === "FORMULA" || mode === "SCRIPT")
  );
}

export function getAppLogicModuleContract(
  module: string
): ExecutableModuleContract | null {
  if (!isAppLogicModule(module) || !isExecutableAppLogicModule(module)) {
    return null;
  }
  return APP_LOGIC_EXECUTABLE_MODULE_CONTRACTS[module];
}

export function getAppLogicSelectionMessage(
  module: string,
  trigger: string,
  mode: string
): string | null {
  const moduleOption = APP_LOGIC_MODULES.find((item) => item.value === module);
  if (!moduleOption) return "Choose a recognized module.";
  if (!moduleOption.available) {
    return "unavailableReason" in moduleOption
      ? String(moduleOption.unavailableReason)
      : `${moduleOption.label} is not connected to app logic.`;
  }

  const triggerOption = APP_LOGIC_TRIGGERS.find(
    (item) => item.value === trigger
  );
  if (!triggerOption) return "Choose a recognized trigger.";

  if (
    isExecutableAppLogicModule(moduleOption.value) &&
    isAppLogicTrigger(trigger) &&
    !APP_LOGIC_MODULE_TRIGGERS[moduleOption.value].some(
      (availableTrigger) => availableTrigger === trigger
    )
  ) {
    return `${triggerOption.label} is not connected for ${moduleOption.label}.`;
  }

  if (!isAppLogicMode(mode)) return "Choose a recognized rule type.";
  return null;
}

function fail(error: string): AppLogicContractResult {
  return { ok: false, error };
}

function expressionError(
  expression: string,
  allowedIdentifiers?: ReadonlySet<string>
): string | null {
  if (!SAFE_EXPRESSION.test(expression)) {
    return "Only numbers, row fields, math operators, comparisons, and approved helper functions are allowed.";
  }
  if (/\.[A-Za-z_$]/.test(expression)) {
    return "Property access is not allowed in app logic.";
  }
  if (FORBIDDEN_TOKENS.test(expression)) {
    return "This rule uses a blocked keyword.";
  }

  if (allowedIdentifiers) {
    const identifiers = expression.match(IDENTIFIER) ?? [];
    const unknown = identifiers.find(
      (identifier) => !allowedIdentifiers.has(identifier)
    );
    if (unknown) return `Unknown field or helper: ${unknown}.`;
  }
  return null;
}

function splitStatements(expression: string): { text: string; line: number }[] {
  return expression
    .split("\n")
    .flatMap((sourceLine, lineIndex) =>
      sourceLine.split(";").map((part) => ({
        text: part.trim(),
        line: lineIndex + 1,
      }))
    )
    .filter(
      ({ text }) =>
        Boolean(text) && !text.startsWith("#") && !text.startsWith("//")
    );
}

export function parseAppLogicProgram(
  module: AppLogicModule,
  mode: AppLogicMode,
  expression: string
): AppLogicContractResult {
  if (!isExecutableAppLogicModule(module)) {
    const message = getAppLogicSelectionMessage(module, "beforeSave", mode);
    return fail(message ?? "This module is not connected to app logic yet.");
  }

  const moduleContract = APP_LOGIC_EXECUTABLE_MODULE_CONTRACTS[module];
  const allowedIdentifiers = new Set<string>([
    ...moduleContract.readableFields,
    ...APP_LOGIC_HELPERS,
  ]);
  const writableFields = new Set<string>(moduleContract.writableFields);
  const sourceStatements = splitStatements(expression);

  if (sourceStatements.length === 0) return fail("Add at least one statement.");
  if (sourceStatements.length > MAX_STATEMENTS) {
    return fail(`A rule may contain at most ${MAX_STATEMENTS} statements.`);
  }

  const statements: AppLogicStatement[] = [];
  for (const source of sourceStatements) {
    let field: string | undefined;
    let formula: string | undefined;

    if (mode === "FORMULA") {
      const match = source.text.match(
        /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/
      );
      if (match) [, field, formula] = match;
    } else {
      const setMatch = source.text.match(
        /^SET\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/i
      );
      if (setMatch) {
        [, field, formula] = setMatch;
      } else {
        const actionMatch = source.text.match(/^ACTION\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
        if (actionMatch) {
          const action = actionMatch[1].toUpperCase();
          const allowedActions = APP_LOGIC_MODULE_ACTIONS[module] as readonly string[];
          if (!APP_LOGIC_ACTIONS.includes(action as AppLogicActionName)) {
            return fail(`Line ${source.line}: unknown governed action ${action}.`);
          }
          if (!allowedActions.includes(action)) {
            return fail(
              `Line ${source.line}: ${action} is not allowed for ${module}.`
            );
          }
          statements.push({
            kind: "action",
            action: action as AppLogicActionName,
            line: source.line,
          });
          continue;
        }
        const requireMatch = source.text.match(/^REQUIRE\s+(.+)$/i);
        if (!requireMatch) {
          return fail(
            `Line ${source.line}: scripts only support SET, REQUIRE, and governed ACTION statements.`
          );
        }
        const requirement = requireMatch[1].trim();
        const requirementError = expressionError(
          requirement,
          allowedIdentifiers
        );
        if (requirementError) {
          return fail(`Line ${source.line}: ${requirementError}`);
        }
        statements.push({
          kind: "require",
          expression: requirement,
          line: source.line,
        });
        continue;
      }
    }

    if (!field || !formula) {
      return fail(
        `Line ${source.line}: expected ${
          mode === "FORMULA" ? "field = expression" : "SET field = expression"
        }.`
      );
    }
    if (!writableFields.has(field)) {
      return fail(`Line ${source.line}: ${field} is not a writable output field.`);
    }

    const formulaError = expressionError(formula, allowedIdentifiers);
    if (formulaError) return fail(`Line ${source.line}: ${formulaError}`);
    statements.push({
      kind: "set",
      field,
      expression: formula,
      line: source.line,
    });
  }

  return { ok: true, program: { module, mode, statements } };
}

export function validateAppLogicRuleContract(
  input: AppLogicRuleContractInput
): AppLogicContractResult {
  if (!isExecutableAppLogicModule(input.module)) {
    const unavailableReason = getAppLogicSelectionMessage(
      input.module,
      input.trigger,
      input.mode
    );
    if (input.enabled) {
      return fail(
        unavailableReason ?? "This module is not connected to app logic yet."
      );
    }

    const sourceStatements = splitStatements(input.expression);
    if (sourceStatements.length === 0) return fail("Add at least one statement.");
    if (sourceStatements.length > MAX_STATEMENTS) {
      return fail(`A rule may contain at most ${MAX_STATEMENTS} statements.`);
    }
    for (const source of sourceStatements) {
      if (/^ACTION\s+[A-Za-z_][A-Za-z0-9_]*$/i.test(source.text)) {
        continue;
      }
      const formula =
        input.mode === "FORMULA"
          ? source.text.match(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.+)$/)?.[1]
          : source.text.match(
                /^(?:SET\s+[A-Za-z_][A-Za-z0-9_]*\s*=|REQUIRE\s+)(.+)$/i
              )?.[1];
      if (!formula) {
        return fail(`Line ${source.line}: invalid ${input.mode.toLowerCase()} statement.`);
      }
      const syntaxError = expressionError(formula);
      if (syntaxError) return fail(`Line ${source.line}: ${syntaxError}`);
    }
    return { ok: true, program: null };
  }

  const parsed = parseAppLogicProgram(
    input.module,
    input.mode,
    input.expression
  );
  if (!parsed.ok) return parsed;

  if (
    parsed.program?.statements.some((statement) => statement.kind === "action") &&
    !(APP_LOGIC_ACTION_TRIGGERS as readonly AppLogicTrigger[]).includes(
      input.trigger
    )
  ) {
    return fail("Governed ACTION statements are only allowed for After Save and Manual triggers.");
  }

  if (input.enabled) {
    const unavailableReason = getAppLogicSelectionMessage(
      input.module,
      input.trigger,
      input.mode
    );
    if (unavailableReason) return fail(unavailableReason);
  }

  return parsed;
}
