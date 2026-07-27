import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("interactive and import spreadsheet writes route through lifecycle pipelines", () => {
  const dataEntries = source("src/lib/actions/data-entries.ts");
  const imports = source("src/lib/actions/import.ts");

  for (const moduleName of [
    "plantIntake",
    "sales",
    "productIntake",
    "overheadExpenses",
    "treatmentTracking",
    "fertilizerLog",
  ]) {
    assert.match(dataEntries, new RegExp(`runDetailedAppLogicRowPipeline\\([\\s\\S]*?"${moduleName}"`));
    assert.match(imports, new RegExp(`loadAuditedDetailedAppLogicRowPipeline\\([\\s\\S]*?"${moduleName}"`));
  }
  assert.match(
    source("src/lib/actions/schedule.ts"),
    /runDetailedAppLogicRowPipeline\([\s\S]*?"schedule"/
  );
  assert.match(dataEntries, /"INTERACTIVE"/);
  assert.match(imports, /"IMPORT"/);
});

test("only the governed broker owns app-logic cross-table product writes", () => {
  const broker = source("src/lib/app-logic-action-broker.ts");
  const runtime = source("src/lib/app-logic-runtime.ts");
  const engine = source("src/lib/app-logic-engine.ts");
  const preview = source("src/lib/app-logic-preview.ts");

  assert.match(broker, /createProductRepository/);
  assert.match(broker, /APP_LOGIC_MODULE_ACTIONS/);
  for (const isolatedSource of [runtime, engine, preview]) {
    assert.doesNotMatch(isolatedSource, /repositories\/product|app-logic-action-broker/);
  }
});

test("owner actions expose preview, manual execution, and tenant-scoped history", () => {
  const actions = source("src/lib/actions/app-logic.ts");
  const manager = source(
    "src/app/(app)/app/[businessSlug]/settings/app-logic/AppLogicManager.tsx"
  );

  assert.match(actions, /previewAppLogicRule/);
  assert.match(actions, /runManualAppLogic/);
  assert.match(actions, /listAppLogicExecutionLogs/);
  assert.ok((actions.match(/requireBusinessRole\(businessSlug, \["OWNER"\]\)/g) ?? []).length >= 3);
  assert.match(manager, /Server preview/);
  assert.match(manager, /Manual execution/);
  assert.match(manager, /Execution history/);
});

test("production runtime and preview never use dynamic JavaScript evaluation", () => {
  for (const relativePath of [
    "src/lib/app-logic-runtime.ts",
    "src/lib/app-logic-engine.ts",
    "src/lib/app-logic-preview.ts",
  ]) {
    const fileSource = source(relativePath);
    assert.doesNotMatch(fileSource, /new\s+Function|\beval\s*\(/);
  }
});
