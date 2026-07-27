import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/lib/app-logic-row-mapping.ts", import.meta.url),
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
  () => {
    throw new Error("The row mapping must not have runtime dependencies.");
  }
);
const mapping = loadedModule.exports;

test("date rows round-trip through deterministic UTC epoch-day fields", () => {
  const input = {
    date: new Date("2026-07-27T00:00:00.000Z"),
    nextEarliest: new Date("2026-08-03T00:00:00.000Z"),
    nextLatest: null,
  };

  const scope = mapping.dateFieldsToAppLogicScope(input);
  const output = mapping.dateFieldsFromAppLogicScope(scope);

  assert.deepEqual(scope, {
    dateEpochDays: 20661,
    nextEarliestEpochDays: 20668,
    nextLatestEpochDays: 0,
  });
  assert.equal(output.date.toISOString(), "2026-07-27T00:00:00.000Z");
  assert.equal(output.nextEarliest.toISOString(), "2026-08-03T00:00:00.000Z");
  assert.equal(output.nextLatest, null);
});

test("schedule rows round-trip through minute-of-day fields", () => {
  const scope = mapping.scheduleToAppLogicScope({
    date: new Date("2026-07-27T00:00:00.000Z"),
    startTime: "09:30",
    endTime: "17:15",
  });
  const output = mapping.scheduleFromAppLogicScope({
    ...scope,
    startMinutes: scope.startMinutes + 15,
  });

  assert.deepEqual(scope, {
    dateEpochDays: 20661,
    startMinutes: 570,
    endMinutes: 1035,
  });
  assert.equal(output.startTime, "09:45");
  assert.equal(output.endTime, "17:15");
});

test("invalid date and schedule outputs fail closed", () => {
  assert.throws(
    () => mapping.optionalDateFromEpochDays(-1, "dateEpochDays"),
    /valid UTC epoch-day/
  );
  assert.throws(
    () => mapping.timeFromMinutes(1440, "endMinutes"),
    /between 0 and 1439/
  );
  assert.throws(
    () =>
      mapping.scheduleFromAppLogicScope({
        dateEpochDays: 0,
        startMinutes: 0,
        endMinutes: 60,
      }),
    /must identify a schedule date/
  );
});
