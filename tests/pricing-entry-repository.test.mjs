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
const { createPricingEntryRepository } = loadTypeScriptModule(
  "../src/lib/repositories/pricing-entry.ts",
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
      pricingEntry: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        create: record("create", { id: "pricing-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
        createMany: record("createMany", { count: 2 }),
      },
    },
  };
}

test("Pricing Entry list cannot escape the context business", async () => {
  const mock = createMockClient();
  const pricing = createPricingEntryRepository(context, mock.client);

  await pricing.list({
    businessId: "business-b",
    sku: "PLANT-1",
  });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", sku: "PLANT-1" },
    ],
  });
});

test("Pricing Entry create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const pricing = createPricingEntryRepository(context, mock.client);

  await pricing.create({
    businessId: "business-b",
    sku: "PLANT-1",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("Pricing Entry update and delete include the context business", async () => {
  const mock = createMockClient();
  const pricing = createPricingEntryRepository(context, mock.client);

  assert.equal(await pricing.updateById("pricing-1", { totalCostCents: 500 }), true);
  assert.equal(await pricing.deleteById("pricing-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "pricing-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "pricing-1",
  });
});

test("Pricing inventory projection is tenant scoped", async () => {
  const mock = createMockClient();
  const pricing = createPricingEntryRepository(context, mock.client);

  await pricing.listInventoryFacts();

  assert.deepEqual(mock.calls[0].args.where, { businessId: "business-a" });
  assert.deepEqual(mock.calls[0].args.orderBy, { updatedAt: "desc" });
});

test("Pricing Entry bulk create injects the business into every row", async () => {
  const mock = createMockClient();
  const pricing = createPricingEntryRepository(context, mock.client);

  await pricing.createMany([{ sku: "PLANT-1" }, { sku: "PLANT-2" }]);

  assert.deepEqual(
    mock.calls[0].args.data.map((row) => row.businessId),
    ["business-a", "business-a"]
  );
});
