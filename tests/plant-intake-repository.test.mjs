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
const { createPlantIntakeRepository } = loadTypeScriptModule(
  "../src/lib/repositories/plant-intake.ts",
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
      plantIntake: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        create: record("create", { id: "plant-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
        createMany: record("createMany", { count: 2 }),
      },
    },
  };
}

test("Plant Intake list cannot escape the context business", async () => {
  const mock = createMockClient();
  const plants = createPlantIntakeRepository(context, mock.client);

  await plants.list({ businessId: "business-b", genus: "Monstera" });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", genus: "Monstera" },
    ],
  });
});

test("Plant Intake create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const plants = createPlantIntakeRepository(context, mock.client);

  await plants.create({
    businessId: "business-b",
    source: "Nursery",
    genus: "Monstera",
    cultivar: "Deliciosa",
    sku: "MON-1",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("Plant Intake manual rows are tenant scoped and bounded", async () => {
  const mock = createMockClient();
  const plants = createPlantIntakeRepository(context, mock.client);

  await plants.listForManualRun(25);

  assert.deepEqual(mock.calls[0].args.where, { businessId: "business-a" });
  assert.equal(mock.calls[0].args.take, 25);
});

test("Plant Intake update and delete include the context business", async () => {
  const mock = createMockClient();
  const plants = createPlantIntakeRepository(context, mock.client);

  assert.equal(await plants.updateById("plant-1", { qty: 3 }), true);
  assert.equal(await plants.deleteById("plant-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "plant-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "plant-1",
  });
});

test("Plant Intake bulk create injects the business into every row", async () => {
  const mock = createMockClient();
  const plants = createPlantIntakeRepository(context, mock.client);

  await plants.createMany([
    { source: "A", genus: "One", cultivar: "One", sku: "ONE" },
    { source: "B", genus: "Two", cultivar: "Two", sku: "TWO" },
  ]);

  assert.deepEqual(
    mock.calls[0].args.data.map((row) => row.businessId),
    ["business-a", "business-a"]
  );
});
