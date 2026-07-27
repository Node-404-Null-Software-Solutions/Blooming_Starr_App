import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadTypeScriptModule(relativeUrl, requireModule = () => ({})) {
  const source = readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "module", "require", compiled)(
    loadedModule.exports,
    loadedModule,
    requireModule
  );
  return loadedModule.exports;
}

const contract = loadTypeScriptModule("../src/lib/app-logic-contract.ts");
const runtime = loadTypeScriptModule(
  "../src/lib/app-logic-runtime.ts",
  (moduleName) => {
    if (moduleName === "@/lib/app-logic-contract") return contract;
    throw new Error(`Unexpected runtime test import: ${moduleName}`);
  }
);

function parseProgram(
  expression,
  mode = "FORMULA",
  module = "sales",
  trigger = "beforeSave"
) {
  const result = contract.validateAppLogicRuleContract({
    module,
    trigger,
    mode,
    expression,
    enabled: true,
  });
  assert.equal(result.ok, true, result.error);
  assert.ok(result.program);
  return result.program;
}

function execute(expression, input, mode = "FORMULA", module = "sales") {
  return runtime.executeAppLogicProgram(
    runtime.compileAppLogicProgram(parseProgram(expression, mode, module)),
    input
  );
}

function loadEngine(repository) {
  return loadTypeScriptModule("../src/lib/app-logic-engine.ts", (moduleName) => {
    if (moduleName === "@/lib/app-logic-contract") return contract;
    if (moduleName === "@/lib/app-logic-runtime") return runtime;
    if (moduleName === "@/lib/repositories/app-logic-rule") {
      return { createAppLogicRuleRepository: () => repository };
    }
    throw new Error(`Unexpected engine test import: ${moduleName}`);
  });
}

const salesInput = {
  qty: 2,
  salePriceCents: 1500,
  costCents: 700,
};

test("sandbox evaluates precedence, helpers, comparisons, and ternaries", () => {
  const output = execute(
    [
      "qty = max(1, floor(qty))",
      "totalSaleCents = qty * salePriceCents",
      "profitCents = totalSaleCents - costCents",
      "marginPct = totalSaleCents > 0 ? (profitCents / totalSaleCents) * 100 : 0",
    ].join("\n"),
    { ...salesInput, qty: 2.9 }
  );

  assert.equal(output.qty, 2);
  assert.equal(output.totalSaleCents, 3000);
  assert.equal(output.profitCents, 2300);
  assert.equal(output.marginPct, (2300 / 3000) * 100);
});

test("sandbox preserves every existing default derived calculation", () => {
  const product = execute(
    "unitCostCents = totalCostCents > 0 && qty > 0 ? round(totalCostCents / qty) : 0",
    { totalCostCents: 4800, qty: 12 },
    "FORMULA",
    "productIntake"
  );
  const overhead = execute(
    [
      "totalCents = subTotalCents + shippingCents - discountCents",
      "unitCostCents = qty > 0 ? round((subTotalCents - discountCents) / qty) : 0",
    ].join("\n"),
    {
      subTotalCents: 12000,
      shippingCents: 1500,
      discountCents: 500,
      qty: 4,
    },
    "FORMULA",
    "overheadExpenses"
  );
  const division = execute(
    "costCents = originalCostCents > 0 ? round(originalCostCents / max(1, totalParts)) : 0",
    { originalCostCents: 3000, totalParts: 3 },
    "FORMULA",
    "transplantLog"
  );

  assert.equal(product.unitCostCents, 400);
  assert.equal(overhead.totalCents, 13000);
  assert.equal(overhead.unitCostCents, 2875);
  assert.equal(division.costCents, 1000);
});

test("sandbox executes active SET and REQUIRE scripts", () => {
  const output = execute(
    [
      "REQUIRE qty > 0 && salePriceCents >= 0",
      "SET totalSaleCents = qty * salePriceCents",
      "SET profitCents = totalSaleCents - costCents",
    ].join("\n"),
    salesInput,
    "SCRIPT"
  );

  assert.equal(output.totalSaleCents, 3000);
  assert.equal(output.profitCents, 2300);
});

test("sandbox emits governed action intents without accessing another table", () => {
  const program = runtime.compileAppLogicProgram(
    parseProgram(
      [
        "SET totalSaleCents = qty * salePriceCents",
        "ACTION SYNC_PRODUCT_MASTER",
      ].join("\n"),
      "SCRIPT",
      "sales",
      "afterSave"
    )
  );

  const result = runtime.executeAppLogicProgramDetailed(program, salesInput);

  assert.equal(result.scope.totalSaleCents, 3000);
  assert.deepEqual(result.actions, [
    { action: "SYNC_PRODUCT_MASTER", line: 2 },
  ]);
});

test("a failed REQUIRE stops the script with a stable runtime code", () => {
  const program = runtime.compileAppLogicProgram(
    parseProgram(
      [
        "SET totalSaleCents = qty * salePriceCents",
        "REQUIRE totalSaleCents > 5000",
        "SET profitCents = totalSaleCents - costCents",
      ].join("\n"),
      "SCRIPT"
    )
  );

  assert.throws(
    () => runtime.executeAppLogicProgram(program, salesInput),
    (error) => {
      assert.equal(error.name, "AppLogicRuntimeError");
      assert.equal(error.code, "REQUIREMENT");
      assert.match(error.message, /line 2/i);
      return true;
    }
  );
});

test("logical operators short-circuit deterministically", () => {
  const output = execute(
    [
      "REQUIRE qty == 0 || salePriceCents / qty > 0",
      "SET totalSaleCents = 0",
    ].join("\n"),
    { ...salesInput, qty: 0 },
    "SCRIPT"
  );

  assert.equal(output.totalSaleCents, 0);
});

test("division by zero and boolean-to-number assignments fail closed", () => {
  assert.throws(
    () =>
      execute(
        "profitCents = salePriceCents / qty",
        { ...salesInput, qty: 0 }
      ),
    (error) => error.code === "ARITHMETIC" && /Division by zero/.test(error.message)
  );
  assert.throws(
    () => execute("profitCents = qty > 0", salesInput),
    (error) => error.code === "TYPE" && /produce a number/.test(error.message)
  );
});

test("helper arity and expression syntax are validated before execution", () => {
  const missingArgument = runtime.validateAppLogicProgram(
    parseProgram("profitCents = round()")
  );
  const malformed = runtime.validateAppLogicProgram(
    parseProgram("profitCents = qty +")
  );

  assert.equal(missingArgument.ok, false);
  assert.match(missingArgument.error, /expects 1 argument/);
  assert.equal(malformed.ok, false);
  assert.match(malformed.error, /Expected a number/i);
});

test("sandbox rejects expressions that exceed structural limits", () => {
  const tooManyTokens = runtime.validateAppLogicProgram(
    parseProgram(
      `profitCents = ${Array.from({ length: 260 }, () => "1").join(" + ")}`
    )
  );
  const tooDeep = runtime.validateAppLogicProgram(
    parseProgram(
      `profitCents = ${"(".repeat(33)}qty${")".repeat(33)}`
    )
  );

  assert.equal(tooManyTokens.ok, false);
  assert.match(tooManyTokens.error, /exceeds 512 tokens/);
  assert.equal(tooDeep.ok, false);
  assert.match(tooDeep.error, /exceeds 32 levels of nesting/);
});

test("sandbox compiler rejects globals and unknown functions without evaluating code", () => {
  const forgedProgram = {
    module: "sales",
    mode: "FORMULA",
    statements: [
      {
        kind: "set",
        field: "profitCents",
        expression: "globalThis",
        line: 1,
      },
    ],
  };
  const functionProgram = {
    ...forgedProgram,
    statements: [
      {
        kind: "set",
        field: "profitCents",
        expression: "random(qty)",
        line: 1,
      },
    ],
  };

  assert.throws(
    () => runtime.compileAppLogicProgram(forgedProgram),
    /Unknown field "globalThis"/
  );
  assert.throws(
    () => runtime.compileAppLogicProgram(functionProgram),
    /Unknown helper "random"/
  );
});

test("same program and input always produce the same output without mutating input", () => {
  const input = { ...salesInput };
  const before = structuredClone(input);
  const program = runtime.compileAppLogicProgram(
    parseProgram(
      [
        "totalSaleCents = qty * salePriceCents",
        "profitCents = totalSaleCents - costCents",
      ].join("\n")
    )
  );

  const first = runtime.executeAppLogicProgram(program, input);
  const second = runtime.executeAppLogicProgram(program, input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
});

test("production app logic contains no dynamic JavaScript evaluator", () => {
  const runtimeSource = readFileSync(
    new URL("../src/lib/app-logic-runtime.ts", import.meta.url),
    "utf8"
  );
  const engineSource = readFileSync(
    new URL("../src/lib/app-logic-engine.ts", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(runtimeSource, /new\s+Function|\beval\s*\(/);
  assert.doesNotMatch(engineSource, /new\s+Function|\beval\s*\(/);
  assert.doesNotMatch(
    runtimeSource,
    /@\/lib\/(?:db|repositories)|@prisma|businessId|\bfetch\s*\(/
  );
});

test("tenant-scoped runner executes formula and script rules in stored order", async () => {
  const repository = {
    countAll: async () => 2,
    listEnabled: async () => [
      {
        id: "formula-1",
        name: "Sale total",
        mode: "FORMULA",
        expression: "totalSaleCents = qty * salePriceCents",
      },
      {
        id: "script-1",
        name: "Profit guard",
        mode: "SCRIPT",
        expression: [
          "REQUIRE totalSaleCents > 0",
          "SET profitCents = totalSaleCents - costCents",
          "SET marginPct = (profitCents / totalSaleCents) * 100",
        ].join("\n"),
      },
    ],
  };
  const engine = loadEngine(repository);
  const runner = await engine.loadAppLogicRunner(
    { businessId: "business-a" },
    "sales",
    "beforeSave"
  );

  const output = runner(salesInput);

  assert.equal(output.totalSaleCents, 3000);
  assert.equal(output.profitCents, 2300);
  assert.equal(output.marginPct, (2300 / 3000) * 100);
});

test("runner preserves the rule name and error code when a script requirement fails", async () => {
  const repository = {
    countAll: async () => 1,
    listEnabled: async () => [
      {
        id: "script-1",
        name: "Positive quantity",
        mode: "SCRIPT",
        expression: "REQUIRE qty > 0",
      },
    ],
  };
  const engine = loadEngine(repository);
  const runner = await engine.loadAppLogicRunner(
    { businessId: "business-a" },
    "sales",
    "beforeSave"
  );

  assert.throws(
    () => runner({ ...salesInput, qty: 0 }),
    (error) => {
      assert.equal(error.code, "REQUIREMENT");
      assert.match(error.message, /Rule "Positive quantity"/);
      return true;
    }
  );
});

test("detailed runner records bounded success and failure audit metadata", async () => {
  const repository = {
    countAll: async () => 2,
    listEnabled: async () => [
      {
        id: "rule-success",
        name: "Calculate total",
        mode: "FORMULA",
        expression: "totalSaleCents = qty * salePriceCents",
      },
      {
        id: "rule-failure",
        name: "Require profit",
        mode: "SCRIPT",
        expression: "REQUIRE profitCents > 0",
      },
    ],
  };
  const engine = loadEngine(repository);
  const runner = await engine.loadDetailedAppLogicRunner(
    { businessId: "business-a" },
    "sales",
    "manual"
  );

  assert.throws(
    () => runner({ ...salesInput, profitCents: 0 }),
    (error) => {
      assert.equal(error.name, "AppLogicExecutionFailure");
      assert.equal(error.executions.length, 2);
      assert.equal(error.executions[0].status, "SUCCEEDED");
      assert.equal(error.executions[1].status, "FAILED");
      assert.equal(error.executions[1].errorCode, "REQUIREMENT");
      assert.equal(error.executions[1].statementCount, 1);
      return true;
    }
  );
});

test("runner refuses excessive active rules before executing a row", async () => {
  const repository = {
    countAll: async () => 26,
    listEnabled: async () =>
      Array.from({ length: 26 }, (_, index) => ({
        id: `rule-${index}`,
        name: `Rule ${index}`,
        mode: "FORMULA",
        expression: "profitCents = totalSaleCents - costCents",
      })),
  };
  const engine = loadEngine(repository);

  await assert.rejects(
    engine.loadDetailedAppLogicRunner(
      { businessId: "business-a" },
      "sales",
      "beforeSave"
    ),
    /exceeds 25 active rules/
  );
});

test("runner caps governed actions across a trigger", async () => {
  const repository = {
    countAll: async () => 11,
    listEnabled: async () =>
      Array.from({ length: 11 }, (_, index) => ({
        id: `rule-${index}`,
        name: `Rule ${index}`,
        mode: "SCRIPT",
        expression: "ACTION SYNC_PRODUCT_MASTER",
      })),
  };
  const engine = loadEngine(repository);
  const runner = await engine.loadDetailedAppLogicRunner(
    { businessId: "business-a" },
    "sales",
    "afterSave"
  );

  assert.throws(
    () => runner(salesInput),
    (error) => error.code === "LIMIT" && /exceeds 10 governed actions/.test(error.message)
  );
});
