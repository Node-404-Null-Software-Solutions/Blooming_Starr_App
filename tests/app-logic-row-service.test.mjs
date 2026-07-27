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
      if (moduleName === "@/lib/app-logic-row-mapping") {
        return {
          dateFieldsToAppLogicScope: overrides.dateFieldsToAppLogicScope ?? (() => ({})),
          dateFieldsFromAppLogicScope: overrides.dateFieldsFromAppLogicScope ?? (() => ({})),
          scheduleToAppLogicScope: overrides.scheduleToAppLogicScope ?? (() => ({})),
          scheduleFromAppLogicScope: overrides.scheduleFromAppLogicScope ?? (() => ({})),
        };
      }
      if (moduleName === "@/lib/repositories/fertilizer-log") {
        return {
          createFertilizerLogRepository:
            overrides.createFertilizerLogRepository ?? (() => ({})),
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
      if (moduleName === "@/lib/repositories/plant-intake") {
        return {
          createPlantIntakeRepository:
            overrides.createPlantIntakeRepository ?? (() => ({})),
        };
      }
      if (moduleName === "@/lib/repositories/schedule-entry") {
        return {
          createScheduleEntryRepository:
            overrides.createScheduleEntryRepository ?? (() => ({})),
        };
      }
      if (moduleName === "@/lib/repositories/treatment-tracking") {
        return {
          createTreatmentTrackingRepository:
            overrides.createTreatmentTrackingRepository ?? (() => ({})),
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
    plantIntake: ["beforeSave", "afterSave", "afterImport", "manual"],
    treatmentTracking: ["beforeSave", "afterSave", "afterImport", "manual"],
    fertilizerLog: ["beforeSave", "afterSave", "afterImport", "manual"],
    schedule: ["beforeSave", "afterSave", "manual"],
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

test("manual Treatment Tracking execution maps numeric dates back to the tenant row", async () => {
  const context = { businessId: "business-a" };
  const calls = [];
  const expectedDates = {
    date: new Date("2026-07-27T00:00:00.000Z"),
    nextEarliest: new Date("2026-08-03T00:00:00.000Z"),
    nextLatest: new Date("2026-08-10T00:00:00.000Z"),
  };
  const service = loadService({
    contract,
    loadDetailedAppLogicRunner: async () => (scope) => ({
      scope: { ...scope, nextEarliestEpochDays: 20668 },
      actions: [],
      executions: [],
    }),
    dateFieldsToAppLogicScope: (fields) => {
      calls.push({ operation: "map-in", fields });
      return {
        dateEpochDays: 20661,
        nextEarliestEpochDays: 0,
        nextLatestEpochDays: 20675,
      };
    },
    dateFieldsFromAppLogicScope: (scope) => {
      calls.push({ operation: "map-out", scope });
      return expectedDates;
    },
    createTreatmentTrackingRepository: (receivedContext) => {
      assert.equal(receivedContext, context);
      return {
        findById: async () => ({
          date: expectedDates.date,
          nextEarliest: null,
          nextLatest: expectedDates.nextLatest,
        }),
        updateById: async (id, data) => {
          calls.push({ operation: "update", id, data });
          return true;
        },
      };
    },
  });

  const result = await service.runManualAppLogicForRow(
    context,
    "treatmentTracking",
    "treatment-a"
  );

  assert.equal(result.found, true);
  assert.equal(result.scope.nextEarliestEpochDays, 20668);
  assert.deepEqual(calls.at(-1), {
    operation: "update",
    id: "treatment-a",
    data: expectedDates,
  });
});

test("manual Schedule execution persists mapped date and minute fields", async () => {
  const context = { businessId: "business-a" };
  const mappedSchedule = {
    date: new Date("2026-07-27T00:00:00.000Z"),
    startTime: "09:30",
    endTime: "17:00",
  };
  let updateCall;
  const service = loadService({
    contract,
    loadDetailedAppLogicRunner: async () => (scope) => ({
      scope: { ...scope, startMinutes: 570 },
      actions: [],
      executions: [],
    }),
    scheduleToAppLogicScope: () => ({
      dateEpochDays: 20661,
      startMinutes: 540,
      endMinutes: 1020,
    }),
    scheduleFromAppLogicScope: (scope) => {
      assert.equal(scope.startMinutes, 570);
      return mappedSchedule;
    },
    createScheduleEntryRepository: (receivedContext) => {
      assert.equal(receivedContext, context);
      return {
        findById: async () => ({
          date: mappedSchedule.date,
          startTime: "09:00",
          endTime: "17:00",
        }),
        updateById: async (id, data) => {
          updateCall = { id, data };
          return true;
        },
      };
    },
  });

  const result = await service.runManualAppLogicForRow(
    context,
    "schedule",
    "schedule-a"
  );

  assert.equal(result.found, true);
  assert.deepEqual(updateCall, { id: "schedule-a", data: mappedSchedule });
});
