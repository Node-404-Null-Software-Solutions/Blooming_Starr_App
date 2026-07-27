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
    throw new Error(`Unexpected preview runtime import: ${moduleName}`);
  }
);
const preview = loadTypeScriptModule(
  "../src/lib/app-logic-preview.ts",
  (moduleName) => {
    if (moduleName === "@/lib/app-logic-contract") return contract;
    if (moduleName === "@/lib/app-logic-runtime") return runtime;
    throw new Error(`Unexpected preview import: ${moduleName}`);
  }
);

test("server preview reports output, changes, and governed actions without executing them", () => {
  const result = preview.previewAppLogicProgram({
    module: "sales",
    trigger: "afterSave",
    mode: "SCRIPT",
    expression: [
      "SET totalSaleCents = qty * salePriceCents",
      "SET profitCents = totalSaleCents - costCents",
      "ACTION SYNC_PRODUCT_MASTER",
    ].join("\n"),
    input: { qty: 3, salePriceCents: 1200, costCents: 900 },
  });

  assert.equal(result.ok, true, result.error);
  assert.equal(result.output.totalSaleCents, 3600);
  assert.equal(result.output.profitCents, 2700);
  assert.deepEqual(result.actions, [
    { action: "SYNC_PRODUCT_MASTER", line: 3 },
  ]);
  assert.deepEqual(
    result.changedFields.map((change) => change.field),
    ["totalSaleCents", "profitCents"]
  );
  assert.equal(result.statementCount, 3);
  assert.equal(result.actionCount, 1);
});

test("preview fills omitted readable fields from the module sample and ignores extras", () => {
  const result = preview.previewAppLogicProgram({
    module: "productIntake",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: "unitCostCents = round(totalCostCents / qty)",
    input: { totalCostCents: 2400, qty: 6, businessId: 123 },
  });

  assert.equal(result.ok, true, result.error);
  assert.equal(result.output.unitCostCents, 400);
  assert.equal(Object.hasOwn(result.output, "businessId"), false);
});

test("preview fails closed for invalid numeric input and failed requirements", () => {
  const invalidInput = preview.previewAppLogicProgram({
    module: "sales",
    trigger: "beforeSave",
    mode: "FORMULA",
    expression: "totalSaleCents = qty * salePriceCents",
    input: { qty: "2", salePriceCents: 1000 },
  });
  const failedRequirement = preview.previewAppLogicProgram({
    module: "sales",
    trigger: "manual",
    mode: "SCRIPT",
    expression: "REQUIRE qty > 0",
    input: { qty: 0 },
  });

  assert.equal(invalidInput.ok, false);
  assert.equal(invalidInput.errorCode, "INPUT");
  assert.match(invalidInput.error, /finite number/);
  assert.equal(failedRequirement.ok, false);
  assert.equal(failedRequirement.errorCode, "REQUIREMENT");
});

test("preview module has no repository, broker, database, or dynamic evaluator access", () => {
  const source = readFileSync(
    new URL("../src/lib/app-logic-preview.ts", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /@\/lib\/(?:db|repositories|app-logic-action-broker)|@prisma|new\s+Function|\beval\s*\(/
  );
});
