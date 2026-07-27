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
const { createPlantSkuReferenceRepository } = loadTypeScriptModule(
  "../src/lib/repositories/plant-sku-reference.ts",
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
      plantSkuReference: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        create: record("create", { id: "reference-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
      },
    },
  };
}

test("Plant SKU Reference list cannot escape the context business", async () => {
  const mock = createMockClient();
  const references = createPlantSkuReferenceRepository(context, mock.client);

  await references.list({
    businessId: "business-b",
    scope: "plant",
  });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", scope: "plant" },
    ],
  });
});

test("Plant SKU Reference lookup is tenant scoped", async () => {
  const mock = createMockClient();
  const references = createPlantSkuReferenceRepository(context, mock.client);

  await references.findActiveByNormalizedName("plant", "HOSTA");

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { scope: "plant", normalizedName: "HOSTA", active: true },
    ],
  });
});

test("Plant SKU Reference create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const references = createPlantSkuReferenceRepository(context, mock.client);

  await references.create({
    businessId: "business-b",
    scope: "plant",
    displayName: "Hosta",
    normalizedName: "HOSTA",
    code: "HO",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("Plant SKU Reference update and delete include the context business", async () => {
  const mock = createMockClient();
  const references = createPlantSkuReferenceRepository(context, mock.client);

  assert.equal(await references.updateById("reference-1", { active: false }), true);
  assert.equal(await references.deleteById("reference-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "reference-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "reference-1",
  });
});
