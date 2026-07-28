import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

function loadTypeScriptModule(relativeUrl) {
  const compiled = ts.transpileModule(read(relativeUrl), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "module", compiled)(
    loadedModule.exports,
    loadedModule,
  );
  return loadedModule.exports;
}

const {
  plantIntakeTotalCostCents,
  plantIntakeUnitCostCents,
  resolvePlantIntakeUnitCostCents,
} = loadTypeScriptModule("../src/lib/plant-intake-cost.ts");

test("Plant Intake stores unit cost and derives purchase total by quantity", () => {
  assert.equal(plantIntakeTotalCostCents(400, 12), 4800);
  assert.equal(plantIntakeUnitCostCents(4800, 12), 400);
  assert.equal(plantIntakeUnitCostCents(1000, 3), 333);
  assert.equal(plantIntakeTotalCostCents(-400, 12), 0);
});

test("an explicit imported unit cost takes precedence over legacy total cost", () => {
  assert.equal(
    resolvePlantIntakeUnitCostCents({
      unitCostCents: 525,
      totalCostCents: 4800,
      quantity: 12,
    }),
    525,
  );
  assert.equal(
    resolvePlantIntakeUnitCostCents({
      totalCostCents: 4800,
      quantity: 12,
    }),
    400,
  );
});

test("Plant Intake entry and import surfaces use the unit-cost convention", () => {
  const form = read(
    "../src/app/(app)/app/[businessSlug]/plant-intake/new/PlantIntakeForm.tsx",
  );
  const table = read(
    "../src/app/(app)/app/[businessSlug]/plant-intake/PlantIntakeTable.tsx",
  );
  const detail = read(
    "../src/app/(app)/app/[businessSlug]/plant-intake/PlantIntakeClient.tsx",
  );
  const importer = read("../src/lib/actions/import.ts");

  assert.match(form, /<FormRow label="Unit Cost" required>/);
  assert.match(form, /Purchase total for/);
  assert.match(form, /plantIntakeTotalCostCents/);
  assert.doesNotMatch(form, /<FormRow label="Total Cost" required>/);
  assert.match(table, />Purchase Total<\/th>/);
  assert.match(table, />Unit Cost<\/th>/);
  assert.match(detail, /label: "Purchase Total"/);
  assert.match(detail, /label: "Unit Cost"/);

  assert.match(importer, /const cUnitCost = col\("Unit Cost", "Cost"\)/);
  assert.match(importer, /const cTotalCost = col\("Total Cost"\)/);
  assert.match(importer, /resolvePlantIntakeUnitCostCents\(\{/);
});

test("Plant Intake aggregates multiply unit amounts and preserve unit views", () => {
  const dashboard = read("../src/lib/dashboard.ts");
  const inventory = read(
    "../src/app/(app)/app/[businessSlug]/plant-inventory/page.tsx",
  );
  const scanner = read(
    "../src/app/(app)/app/[businessSlug]/sku-scanner/page.tsx",
  );

  assert.match(
    dashboard,
    /const purchaseTotal = plantIntakeTotalCostCents\(cost, qty\)/,
  );
  assert.match(
    dashboard,
    /const totalMsrp = plantIntakeTotalCostCents\(msrp, qty\)/,
  );
  assert.match(inventory, /plantCostTotalCents/);
  assert.match(inventory, /plantIntakeUnitCostCents\(/);
  assert.match(scanner, /totalCostCents/);
  assert.match(scanner, /plantIntakeUnitCostCents\(/);
});
