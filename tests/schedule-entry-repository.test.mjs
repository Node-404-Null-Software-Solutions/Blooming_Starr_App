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

const tenantScope = loadTypeScriptModule(
  "../src/lib/repositories/tenant-scope.ts"
);
const { createScheduleEntryRepository } = loadTypeScriptModule(
  "../src/lib/repositories/schedule-entry.ts",
  (moduleName) => {
    if (moduleName === "@/lib/db") return { db: {} };
    if (moduleName === "@/lib/repositories/tenant-scope") return tenantScope;
    throw new Error(`Unexpected test import: ${moduleName}`);
  }
);

const context = {
  requestId: "request-1",
  userId: "user-1",
  membershipId: "membership-1",
  businessId: "business-a",
  businessSlug: "business-a",
  role: "OWNER",
};

function createMockClient() {
  const calls = [];
  const record = (method, result) => async (args) => {
    calls.push({ method, args });
    return result;
  };
  return {
    calls,
    client: {
      scheduleEntry: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        create: record("create", { id: "schedule-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
      },
    },
  };
}

test("Schedule Entry list cannot escape the context business", async () => {
  const mock = createMockClient();
  const schedule = createScheduleEntryRepository(context, mock.client);

  await schedule.list({
    businessId: "business-b",
    employeeId: "employee-1",
  });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", employeeId: "employee-1" },
    ],
  });
});

test("Schedule Entry create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const schedule = createScheduleEntryRepository(context, mock.client);

  await schedule.create({
    businessId: "business-b",
    employeeId: "employee-1",
    date: new Date("2026-07-20"),
    startTime: "09:00",
    endTime: "17:00",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("Schedule manual rows are tenant scoped and bounded", async () => {
  const mock = createMockClient();
  const schedule = createScheduleEntryRepository(context, mock.client);

  await schedule.listForManualRun(25);

  assert.deepEqual(mock.calls[0].args.where, { businessId: "business-a" });
  assert.equal(mock.calls[0].args.take, 25);
  assert.deepEqual(mock.calls[0].args.select.employee, {
    select: { name: true },
  });
});

test("Schedule Entry update and delete include the context business", async () => {
  const mock = createMockClient();
  const schedule = createScheduleEntryRepository(context, mock.client);

  assert.equal(await schedule.updateById("schedule-1", { title: "Watering" }), true);
  assert.equal(await schedule.deleteById("schedule-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "schedule-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "schedule-1",
  });
});

test("Weekly Schedule query is tenant scoped and includes employee names", async () => {
  const mock = createMockClient();
  const schedule = createScheduleEntryRepository(context, mock.client);
  const rangeStart = new Date("2026-07-20T00:00:00");
  const rangeEnd = new Date("2026-07-26T23:59:59");

  await schedule.listForWeek(rangeStart, rangeEnd);

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { date: { gte: rangeStart, lte: rangeEnd } },
    ],
  });
  assert.deepEqual(mock.calls[0].args.include, {
    employee: { select: { name: true } },
  });
});
