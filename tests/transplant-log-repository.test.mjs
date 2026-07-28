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
const { createTransplantLogRepository } = loadTypeScriptModule(
  "../src/lib/repositories/transplant-log.ts",
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
      transplantLog: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        count: record("count", 0),
        create: record("create", { id: "transplant-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
        createMany: record("createMany", { count: 2 }),
      },
    },
  };
}

test("Transplant Log list cannot escape the context business", async () => {
  const mock = createMockClient();
  const transplants = createTransplantLogRepository(context, mock.client);

  await transplants.list({
    businessId: "business-b",
    originalSku: "PLANT-1",
  });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", originalSku: "PLANT-1" },
    ],
  });
});

test("Transplant Log create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const transplants = createTransplantLogRepository(context, mock.client);

  await transplants.create({
    businessId: "business-b",
    originalSku: "PLANT-1",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("Transplant Log update and delete include the context business", async () => {
  const mock = createMockClient();
  const transplants = createTransplantLogRepository(context, mock.client);

  assert.equal(await transplants.updateById("transplant-1", { costCents: 50 }), true);
  assert.equal(await transplants.deleteById("transplant-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "transplant-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "transplant-1",
  });
});

test("Division count is scoped to the context business", async () => {
  const mock = createMockClient();
  const transplants = createTransplantLogRepository(context, mock.client);

  await transplants.countDivisionActions("PLANT-1");

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { originalSku: "PLANT-1", action: { contains: "ivision" } },
    ],
  });
});

test("Transplant bulk create injects the business into every row", async () => {
  const mock = createMockClient();
  const transplants = createTransplantLogRepository(context, mock.client);

  await transplants.createMany([
    { originalSku: "ONE" },
    { originalSku: "TWO" },
  ]);

  assert.deepEqual(
    mock.calls[0].args.data.map((row) => row.businessId),
    ["business-a", "business-a"]
  );
});

test("Transplant bulk delete is tenant scoped", async () => {
  const mock = createMockClient();
  const transplants = createTransplantLogRepository(context, mock.client);

  assert.equal(
    await transplants.deleteByIds(["transplant-1", "transplant-2"]),
    1
  );
  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: { in: ["transplant-1", "transplant-2"] },
  });
});
