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
const requireRepositoryDependency = (moduleName) => {
  if (moduleName === "@/lib/db") return { db: {} };
  if (moduleName === "@/lib/repositories/tenant-scope") return tenantScope;
  throw new Error(`Unexpected test import: ${moduleName}`);
};
const { createProductRepository } = loadTypeScriptModule(
  "../src/lib/repositories/product.ts",
  requireRepositoryDependency
);
const { createProductIntakeRepository } = loadTypeScriptModule(
  "../src/lib/repositories/product-intake.ts",
  requireRepositoryDependency
);

const context = {
  requestId: "request-1",
  userId: "user-1",
  membershipId: "membership-1",
  businessId: "business-a",
  businessSlug: "business-a",
  role: "OWNER",
};

function recorder(calls, method, result) {
  return async (args) => {
    calls.push({ method, args });
    return result;
  };
}

function createProductClient() {
  const calls = [];
  return {
    calls,
    client: {
      product: {
        findUnique: recorder(calls, "findUnique", null),
        create: recorder(calls, "create", { id: "product-1" }),
        upsert: recorder(calls, "upsert", { id: "product-1" }),
      },
    },
  };
}

function createProductIntakeClient() {
  const calls = [];
  return {
    calls,
    client: {
      productIntake: {
        findMany: recorder(calls, "findMany", []),
        findFirst: recorder(calls, "findFirst", null),
        create: recorder(calls, "create", { id: "intake-1" }),
        updateMany: recorder(calls, "updateMany", { count: 1 }),
        deleteMany: recorder(calls, "deleteMany", { count: 1 }),
        createMany: recorder(calls, "createMany", { count: 2 }),
      },
    },
  };
}

test("Product lookup uses the context business and SKU composite key", async () => {
  const mock = createProductClient();
  const products = createProductRepository(context, mock.client);

  await products.findBySku("PRODUCT-1");

  assert.deepEqual(mock.calls[0].args.where, {
    businessId_sku: { businessId: "business-a", sku: "PRODUCT-1" },
  });
});

test("Product create and upsert inject the context business", async () => {
  const mock = createProductClient();
  const products = createProductRepository(context, mock.client);

  await products.create({ businessId: "business-b", sku: "PRODUCT-1" });
  await products.upsertBySku(
    "PRODUCT-2",
    { productName: "Pot" },
    { productName: "Updated Pot" }
  );

  assert.deepEqual(mock.calls[0].args.data, {
    businessId: "business-a",
    sku: "PRODUCT-1",
  });
  assert.deepEqual(mock.calls[1].args.create, {
    businessId: "business-a",
    sku: "PRODUCT-2",
    productName: "Pot",
  });
});

test("Product Intake list cannot escape the context business", async () => {
  const mock = createProductIntakeClient();
  const intakes = createProductIntakeRepository(context, mock.client);

  await intakes.list({ businessId: "business-b", sku: "PRODUCT-1" });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", sku: "PRODUCT-1" },
    ],
  });
});

test("Product Intake mutations include the context business", async () => {
  const mock = createProductIntakeClient();
  const intakes = createProductIntakeRepository(context, mock.client);

  await intakes.create({ businessId: "business-b", sku: "PRODUCT-1" });
  assert.equal(await intakes.updateById("intake-1", { qty: 2 }), true);
  assert.equal(await intakes.deleteById("intake-1"), true);

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "intake-1",
  });
  assert.deepEqual(mock.calls[2].args.where, {
    businessId: "business-a",
    id: "intake-1",
  });
});

test("Product Intake bulk create injects the business into every row", async () => {
  const mock = createProductIntakeClient();
  const intakes = createProductIntakeRepository(context, mock.client);

  await intakes.createMany([{ sku: "ONE" }, { sku: "TWO" }]);

  assert.deepEqual(mock.calls[0].args.data, [
    { businessId: "business-a", sku: "ONE" },
    { businessId: "business-a", sku: "TWO" },
  ]);
});
