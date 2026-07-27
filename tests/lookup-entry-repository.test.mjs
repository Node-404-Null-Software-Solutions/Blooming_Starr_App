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
const { createLookupEntryRepository } = loadTypeScriptModule(
  "../src/lib/repositories/lookup-entry.ts",
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
      lookupEntry: {
        findMany: record("findMany", []),
        createMany: record("createMany", { count: 2 }),
        deleteMany: record("deleteMany", { count: 2 }),
      },
    },
  };
}

test("Lookup Entry list cannot escape the context business", async () => {
  const mock = createMockClient();
  const lookupEntries = createLookupEntryRepository(context, mock.client);

  await lookupEntries.list({
    businessId: "business-b",
    table: { in: ["plantSource"] },
  });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", table: { in: ["plantSource"] } },
    ],
  });
});

test("Lookup Entry bulk create injects the business into every row", async () => {
  const mock = createMockClient();
  const lookupEntries = createLookupEntryRepository(context, mock.client);

  await lookupEntries.createMany(
    [
      { businessId: "business-b", table: "origin", name: "Local", code: "LOCAL" },
      { businessId: "business-c", table: "status", name: "Active", code: "ACTIVE" },
    ],
    { skipDuplicates: true }
  );

  assert.deepEqual(
    mock.calls[0].args.data.map((row) => row.businessId),
    ["business-a", "business-a"]
  );
  assert.equal(mock.calls[0].args.skipDuplicates, true);
});

test("Lookup Entry tenant clear cannot delete another business", async () => {
  const mock = createMockClient();
  const lookupEntries = createLookupEntryRepository(context, mock.client);

  await lookupEntries.deleteAll();

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
  });
});
