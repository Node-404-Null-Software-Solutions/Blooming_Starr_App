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
const { createFertilizerLogRepository } = loadTypeScriptModule(
  "../src/lib/repositories/fertilizer-log.ts",
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
      fertilizerLog: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        create: record("create", { id: "fertilizer-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
        createMany: record("createMany", { count: 2 }),
      },
    },
  };
}

test("Fertilizer Log list cannot escape the context business", async () => {
  const mock = createMockClient();
  const fertilizerLogs = createFertilizerLogRepository(context, mock.client);

  await fertilizerLogs.list({
    businessId: "business-b",
    plantSku: "PLANT-1",
  });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", plantSku: "PLANT-1" },
    ],
  });
});

test("Fertilizer Log create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const fertilizerLogs = createFertilizerLogRepository(context, mock.client);

  await fertilizerLogs.create({
    businessId: "business-b",
    plantSku: "PLANT-1",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("Fertilizer Log manual rows are tenant scoped and bounded", async () => {
  const mock = createMockClient();
  const fertilizerLogs = createFertilizerLogRepository(context, mock.client);

  await fertilizerLogs.listForManualRun(25);

  assert.deepEqual(mock.calls[0].args.where, { businessId: "business-a" });
  assert.equal(mock.calls[0].args.take, 25);
});

test("Fertilizer Log update and delete include the context business", async () => {
  const mock = createMockClient();
  const fertilizerLogs = createFertilizerLogRepository(context, mock.client);

  assert.equal(
    await fertilizerLogs.updateById("fertilizer-1", { product: "Feed A" }),
    true
  );
  assert.equal(await fertilizerLogs.deleteById("fertilizer-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "fertilizer-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "fertilizer-1",
  });
});

test("Fertilizer Log import deduplication is tenant scoped", async () => {
  const mock = createMockClient();
  const fertilizerLogs = createFertilizerLogRepository(context, mock.client);

  await fertilizerLogs.listForImportDeduplication();

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
  });
});

test("Fertilizer Log bulk create injects the business into every row", async () => {
  const mock = createMockClient();
  const fertilizerLogs = createFertilizerLogRepository(context, mock.client);

  await fertilizerLogs.createMany([
    { plantSku: "PLANT-1" },
    { plantSku: "PLANT-2" },
  ]);

  assert.deepEqual(
    mock.calls[0].args.data.map((row) => row.businessId),
    ["business-a", "business-a"]
  );
});
