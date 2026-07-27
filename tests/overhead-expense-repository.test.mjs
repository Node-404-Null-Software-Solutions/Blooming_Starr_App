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
const { createOverheadExpenseRepository } = loadTypeScriptModule(
  "../src/lib/repositories/overhead-expense.ts",
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
      overheadExpense: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        groupBy: record("groupBy", []),
        create: record("create", { id: "expense-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
        createMany: record("createMany", { count: 2 }),
      },
    },
  };
}

test("Overhead Expense list cannot escape the context business", async () => {
  const mock = createMockClient();
  const expenses = createOverheadExpenseRepository(context, mock.client);

  await expenses.list({
    businessId: "business-b",
    category: "Supplies",
  });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", category: "Supplies" },
    ],
  });
});

test("Overhead Expense create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const expenses = createOverheadExpenseRepository(context, mock.client);

  await expenses.create({
    businessId: "business-b",
    vendor: "Vendor A",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("Overhead Expense update and delete include the context business", async () => {
  const mock = createMockClient();
  const expenses = createOverheadExpenseRepository(context, mock.client);

  assert.equal(await expenses.updateById("expense-1", { totalCents: 500 }), true);
  assert.equal(await expenses.deleteById("expense-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "expense-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "expense-1",
  });
});

test("Overhead Expense category summary is tenant scoped", async () => {
  const mock = createMockClient();
  const expenses = createOverheadExpenseRepository(context, mock.client);

  await expenses.summarizeByCategory({ date: { gte: new Date("2026-01-01") } });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { date: { gte: new Date("2026-01-01") } },
    ],
  });
});

test("Overhead Expense bulk create injects the business into every row", async () => {
  const mock = createMockClient();
  const expenses = createOverheadExpenseRepository(context, mock.client);

  await expenses.createMany([
    { vendor: "Vendor One" },
    { vendor: "Vendor Two" },
  ]);

  assert.deepEqual(
    mock.calls[0].args.data.map((row) => row.businessId),
    ["business-a", "business-a"]
  );
});
