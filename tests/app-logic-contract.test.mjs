import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadContract() {
  const source = readFileSync(
    new URL("../src/lib/app-logic-contract.ts", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "module", compiled)(
    loadedModule.exports,
    loadedModule
  );
  return loadedModule.exports;
}

const contract = loadContract();

function loadRuntime() {
  const source = readFileSync(
    new URL("../src/lib/app-logic-runtime.ts", import.meta.url),
    "utf8"
  );
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
    (moduleName) => {
      if (moduleName === "@/lib/app-logic-contract") return contract;
      throw new Error(`Unexpected test import: ${moduleName}`);
    }
  );
  return loadedModule.exports;
}

const runtime = loadRuntime();

test("App Logic contract exposes only the fields a connected module may read and write", () => {
  const sales = contract.getAppLogicModuleContract("sales");

  assert.deepEqual(sales.readableFields, [
    "qty",
    "salePriceCents",
    "costCents",
    "totalSaleCents",
    "profitCents",
    "marginPct",
  ]);
  assert.deepEqual(sales.writableFields, [
    "qty",
    "totalSaleCents",
    "profitCents",
    "marginPct",
  ]);
  assert.equal(contract.getAppLogicModuleContract("plantIntake"), null);
});

test("connected before-save formulas may be activated", () => {
  const result = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: [
      "qty = max(1, floor(qty))",
      "totalSaleCents = qty * salePriceCents",
      "profitCents = totalSaleCents - costCents",
    ].join("\n"),
    enabled: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.program.statements.length, 3);
  assert.equal(result.program.statements[1].field, "totalSaleCents");
});

test("formula expressions are compiled by the sandbox before saving", () => {
  const parsed = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: "profitCents = qty +",
    enabled: false,
  });

  assert.equal(parsed.ok, true);
  const validation = runtime.validateAppLogicProgram(parsed.program);
  assert.equal(validation.ok, false);
  assert.equal(typeof validation.error, "string");
  assert.ok(validation.error.length > 0);
});

test("formulas cannot write to input-only fields", () => {
  const result = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: "salePriceCents = salePriceCents * 2",
    enabled: false,
  });

  assert.deepEqual(result, {
    ok: false,
    error: "Line 1: salePriceCents is not a writable output field.",
  });
});

test("formulas reject fields outside their module contract", () => {
  const result = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: "profitCents = secretCostCents",
    enabled: false,
  });

  assert.deepEqual(result, {
    ok: false,
    error: "Line 1: Unknown field or helper: secretCostCents.",
  });
});

test("scripts parse into SET and REQUIRE statements and can be activated", () => {
  const draft = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "SCRIPT",
    expression: [
      "REQUIRE qty > 0",
      "SET totalSaleCents = qty * salePriceCents",
    ].join("\n"),
    enabled: false,
  });
  const active = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "SCRIPT",
    expression: "SET totalSaleCents = qty * salePriceCents",
    enabled: true,
  });

  assert.equal(draft.ok, true);
  assert.deepEqual(
    draft.program.statements.map((statement) => statement.kind),
    ["require", "set"]
  );
  assert.equal(active.ok, true);
});

test("script drafts reject arbitrary JavaScript and property access", () => {
  const javascript = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "SCRIPT",
    expression: "fetch(totalSaleCents)",
    enabled: false,
  });
  const propertyAccess = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "SCRIPT",
    expression: "SET totalSaleCents = qty.constructor",
    enabled: false,
  });

  assert.match(javascript.error, /only support SET/i);
  assert.match(propertyAccess.error, /Property access is not allowed/);
});

test("governed actions are allowlisted by module and lifecycle trigger", () => {
  const allowed = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "afterSave",
    mode: "SCRIPT",
    expression: "ACTION SYNC_PRODUCT_MASTER",
    enabled: true,
  });
  const wrongTrigger = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "SCRIPT",
    expression: "ACTION SYNC_PRODUCT_MASTER",
    enabled: true,
  });
  const wrongModule = contract.validateAppLogicRuleContract({
    module: "overheadExpenses",
    trigger: "afterSave",
    mode: "SCRIPT",
    expression: "ACTION SYNC_PRODUCT_MASTER",
    enabled: true,
  });
  const unknown = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "afterSave",
    mode: "SCRIPT",
    expression: "ACTION DELETE_EVERYTHING",
    enabled: false,
  });

  assert.equal(allowed.ok, true);
  assert.match(wrongTrigger.error, /only allowed for After Save and Manual/);
  assert.match(wrongModule.error, /not allowed for overheadExpenses/);
  assert.match(unknown.error, /unknown governed action DELETE_EVERYTHING/);
});

test("planned modules preserve safe inactive drafts but reject activation", () => {
  const draft = contract.validateAppLogicRuleContract({
    module: "plantIntake",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: "msrpCents = costCents * 2",
    enabled: false,
  });
  const active = contract.validateAppLogicRuleContract({
    module: "plantIntake",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: "msrpCents = costCents * 2",
    enabled: true,
  });

  assert.deepEqual(draft, { ok: true, program: null });
  assert.deepEqual(active, {
    ok: false,
    error: "Plant Intake is not connected to the app-logic runtime yet.",
  });
});

test("module-specific unconnected triggers may remain drafts but cannot be activated", () => {
  const draft = contract.validateAppLogicRuleContract({
    module: "transplantLog",
    trigger: "manual",
    mode: "FORMULA",
    expression: "costCents = originalCostCents / max(1, totalParts)",
    enabled: false,
  });
  const active = contract.validateAppLogicRuleContract({
    module: "transplantLog",
    trigger: "manual",
    mode: "FORMULA",
    expression: "costCents = originalCostCents / max(1, totalParts)",
    enabled: true,
  });

  assert.equal(draft.ok, true);
  assert.deepEqual(active, {
    ok: false,
    error: "Manual is not connected for Transplant Log.",
  });
});

test("rules have a deterministic statement limit", () => {
  const expression = Array.from(
    { length: 101 },
    () => "profitCents = totalSaleCents - costCents"
  ).join("\n");
  const result = contract.validateAppLogicRuleContract({
    module: "sales",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression,
    enabled: false,
  });

  assert.deepEqual(result, {
    ok: false,
    error: "A rule may contain at most 100 statements.",
  });
});

test("the executable selection matrix is explicit", () => {
  assert.equal(
    contract.isExecutableAppLogicSelection(
      "overheadExpenses",
      "beforeSave",
      "FORMULA"
    ),
    true
  );
  assert.equal(
    contract.isExecutableAppLogicSelection("sales", "manual", "FORMULA"),
    true
  );
  assert.equal(
    contract.isExecutableAppLogicSelection("sales", "beforeSave", "SCRIPT"),
    true
  );
  assert.equal(
    contract.isExecutableAppLogicSelection(
      "transplantLog",
      "manual",
      "SCRIPT"
    ),
    false
  );
});
