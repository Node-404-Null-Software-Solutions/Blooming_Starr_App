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
const salesModule = loadTypeScriptModule(
  "../src/lib/repositories/sales.ts",
  (moduleName) => {
    if (moduleName === "@/lib/db") return { db: {} };
    if (moduleName === "@/lib/repositories/tenant-scope") {
      return tenantScope;
    }
    throw new Error(`Unexpected test import: ${moduleName}`);
  }
);
const { createSalesRepository } = salesModule;

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
      salesEntry: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        create: record("create", { id: "sale-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
        createMany: record("createMany", { count: 2 }),
      },
    },
  };
}

test("Sales list combines caller filters with the context business", async () => {
  const mock = createMockClient();
  const sales = createSalesRepository(context, mock.client);

  await sales.list({ businessId: "business-b", sku: "PLANT-1" });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", sku: "PLANT-1" },
    ],
  });
});

test("Sales create overwrites any runtime-supplied business ID", async () => {
  const mock = createMockClient();
  const sales = createSalesRepository(context, mock.client);

  await sales.create({ businessId: "business-b", sku: "PLANT-1" });

  assert.deepEqual(mock.calls[0].args.data, {
    businessId: "business-a",
    sku: "PLANT-1",
  });
});

test("Sales update and delete include the context business", async () => {
  const mock = createMockClient();
  const sales = createSalesRepository(context, mock.client);

  assert.equal(await sales.updateById("sale-1", { qty: 3 }), true);
  assert.equal(await sales.deleteById("sale-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "sale-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "sale-1",
  });
});

test("Sales bulk create injects the context business into every row", async () => {
  const mock = createMockClient();
  const sales = createSalesRepository(context, mock.client);

  await sales.createMany(
    [
      { sku: "PLANT-1", qty: 1 },
      { sku: "PLANT-2", qty: 2 },
    ],
    { skipDuplicates: true }
  );

  assert.deepEqual(mock.calls[0].args, {
    data: [
      { businessId: "business-a", sku: "PLANT-1", qty: 1 },
      { businessId: "business-a", sku: "PLANT-2", qty: 2 },
    ],
    skipDuplicates: true,
  });
});

test("Sales bulk delete is tenant scoped", async () => {
  const mock = createMockClient();
  const sales = createSalesRepository(context, mock.client);

  assert.equal(await sales.deleteByIds(["sale-1", "sale-2"]), 1);
  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: { in: ["sale-1", "sale-2"] },
  });
});

test("Sales raw export is tenant scoped and selects transaction fields", async () => {
  const mock = createMockClient();
  const sales = createSalesRepository(context, mock.client);
  const where = { date: { gte: new Date("2026-01-01") } };

  await sales.listForRawExport(where);

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [{ businessId: "business-a" }, where],
  });
  assert.equal(mock.calls[0].args.select.customerName, true);
  assert.equal(mock.calls[0].args.select.totalSaleCents, true);
  assert.equal(mock.calls[0].args.select.externalUid, true);
});
