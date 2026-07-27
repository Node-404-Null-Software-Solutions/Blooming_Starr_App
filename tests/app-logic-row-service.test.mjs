import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadService(overrides = {}) {
  const source = readFileSync(
    new URL("../src/lib/app-logic-row-service.ts", import.meta.url),
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
      if (moduleName === "@/lib/app-logic-contract") return overrides.contract;
      if (moduleName === "@/lib/app-logic-engine") {
        class AppLogicExecutionFailure extends Error {}
        return {
          loadAppLogicRunner: overrides.loadAppLogicRunner ?? (() => {}),
          loadDetailedAppLogicRunner:
            overrides.loadDetailedAppLogicRunner ?? (() => {}),
          AppLogicExecutionFailure,
        };
      }
      if (moduleName === "@/lib/app-logic-audit") {
        return {
          persistAppLogicExecutionAudit:
            overrides.persistAppLogicExecutionAudit ?? (async () => {}),
        };
      }
      if (moduleName === "@/lib/app-logic-action-broker") {
        return {
          executeGovernedAppLogicActions:
            overrides.executeGovernedAppLogicActions ?? (async () => []),
        };
      }
      if (moduleName === "@/lib/repositories/sales") {
        return { createSalesRepository: overrides.createSalesRepository ?? (() => ({})) };
      }
      if (moduleName === "@/lib/repositories/product-intake") {
        return {
          createProductIntakeRepository:
            overrides.createProductIntakeRepository ?? (() => ({})),
        };
      }
      if (moduleName === "@/lib/repositories/overhead-expense") {
        return {
          createOverheadExpenseRepository:
            overrides.createOverheadExpenseRepository ?? (() => ({})),
        };
      }
      throw new Error(`Unexpected row-service test import: ${moduleName}`);
    }
  );
  return loadedModule.exports;
}

const contract = {
  APP_LOGIC_MODULE_TRIGGERS: {
    sales: ["beforeSave", "afterSave", "afterImport", "manual"],
    productIntake: ["beforeSave", "afterSave", "afterImport", "manual"],
    overheadExpenses: ["beforeSave", "afterSave", "afterImport", "manual"],
    transplantLog: ["beforeSave"],
  },
};

test("interactive lifecycle runs beforeSave then afterSave in order", async () => {
  const calls = [];
  const loadRunner = async (_context, _module, trigger) => {
    calls.push(trigger);
    return (scope) => ({ ...scope, value: (scope.value ?? 0) * 10 + calls.indexOf(trigger) + 1 });
  };
  const service = loadService({ contract });
  const run = await service.loadAppLogicRowPipeline(
    { businessId: "business-a" },
    "sales",
    "INTERACTIVE",
    loadRunner
  );

  const output = run({ value: 0 });

  assert.deepEqual(calls, ["beforeSave", "afterSave"]);
  assert.equal(output.value, 12);
});

test("import lifecycle runs beforeSave then afterImport", async () => {
  const calls = [];
  const loadRunner = async (_context, _module, trigger) => {
    calls.push(trigger);
    return (scope) => ({ ...scope, [trigger]: 1 });
  };
  const service = loadService({ contract });
  const run = await service.loadAppLogicRowPipeline(
    { businessId: "business-a" },
    "overheadExpenses",
    "IMPORT",
    loadRunner
  );

  const output = run({ totalCents: 0 });

  assert.deepEqual(calls, ["beforeSave", "afterImport"]);
  assert.equal(output.beforeSave, 1);
  assert.equal(output.afterImport, 1);
});

test("module trigger matrix prevents unsupported transplant lifecycle stages", async () => {
  const calls = [];
  const service = loadService({ contract });
  await service.loadAppLogicRowPipeline(
    { businessId: "business-a" },
    "transplantLog",
    "INTERACTIVE",
    async (_context, _module, trigger) => {
      calls.push(trigger);
      return (scope) => scope;
    }
  );

  assert.deepEqual(calls, ["beforeSave"]);
});

test("manual execution reads and updates only through the context repository", async () => {
  const calls = [];
  const context = { businessId: "business-a" };
  const service = loadService({
    contract,
    loadDetailedAppLogicRunner: async (receivedContext, module, trigger) => {
      calls.push({ operation: "load", receivedContext, module, trigger });
      return (scope) => ({
        scope: {
          ...scope,
          totalSaleCents: scope.qty * scope.salePriceCents,
          profitCents: scope.qty * scope.salePriceCents - scope.costCents,
        },
        actions: [],
        executions: [],
      });
    },
    createSalesRepository: (receivedContext) => {
      calls.push({ operation: "repository", receivedContext });
      return {
        findById: async (id) => {
          calls.push({ operation: "find", id });
          return {
            qty: 2,
            salePriceCents: 1500,
            costCents: 700,
            totalSaleCents: 0,
            profitCents: 0,
            marginPct: 0,
          };
        },
        updateById: async (id, data) => {
          calls.push({ operation: "update", id, data });
          return true;
        },
      };
    },
  });

  const result = await service.runManualAppLogicForRow(
    context,
    "sales",
    "row-a"
  );

  assert.equal(result.found, true);
  assert.equal(result.scope.profitCents, 2300);
  assert.equal(calls[0].receivedContext, context);
  assert.equal(calls[1].receivedContext, context);
  assert.deepEqual(calls.at(-1), {
    operation: "update",
    id: "row-a",
    data: {
      qty: 2,
      totalSaleCents: 3000,
      profitCents: 2300,
      marginPct: 0,
    },
  });
});
