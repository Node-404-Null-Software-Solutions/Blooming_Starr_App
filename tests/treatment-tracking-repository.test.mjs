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
const { createTreatmentTrackingRepository } = loadTypeScriptModule(
  "../src/lib/repositories/treatment-tracking.ts",
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
      treatmentTracking: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        create: record("create", { id: "treatment-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
        createMany: record("createMany", { count: 2 }),
      },
    },
  };
}

test("Treatment Tracking list cannot escape the context business", async () => {
  const mock = createMockClient();
  const treatments = createTreatmentTrackingRepository(context, mock.client);

  await treatments.list({
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

test("Treatment Tracking create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const treatments = createTreatmentTrackingRepository(context, mock.client);

  await treatments.create({
    businessId: "business-b",
    sku: "PLANT-1",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("Treatment Tracking manual rows are tenant scoped and bounded", async () => {
  const mock = createMockClient();
  const treatments = createTreatmentTrackingRepository(context, mock.client);

  await treatments.listForManualRun(25);

  assert.deepEqual(mock.calls[0].args.where, { businessId: "business-a" });
  assert.equal(mock.calls[0].args.take, 25);
});

test("Treatment Tracking update and delete include the context business", async () => {
  const mock = createMockClient();
  const treatments = createTreatmentTrackingRepository(context, mock.client);

  assert.equal(
    await treatments.updateById("treatment-1", { target: "Aphids" }),
    true
  );
  assert.equal(await treatments.deleteById("treatment-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "treatment-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "treatment-1",
  });
});

test("Treatment Tracking update carries notes inside the tenant scope", async () => {
  const mock = createMockClient();
  const treatments = createTreatmentTrackingRepository(context, mock.client);

  await treatments.updateById("treatment-1", {
    notes: "Recheck the lower leaves.",
  });

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "treatment-1",
  });
  assert.deepEqual(mock.calls[0].args.data, {
    notes: "Recheck the lower leaves.",
  });
});

test("Treatment Tracking import deduplication is tenant scoped", async () => {
  const mock = createMockClient();
  const treatments = createTreatmentTrackingRepository(context, mock.client);

  await treatments.listForImportDeduplication();

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
  });
});

test("Treatment Tracking bulk create injects the business into every row", async () => {
  const mock = createMockClient();
  const treatments = createTreatmentTrackingRepository(context, mock.client);

  await treatments.createMany([
    { sku: "PLANT-1" },
    { sku: "PLANT-2" },
  ]);

  assert.deepEqual(
    mock.calls[0].args.data.map((row) => row.businessId),
    ["business-a", "business-a"]
  );
});
