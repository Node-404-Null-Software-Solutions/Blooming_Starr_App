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
const { createAppLogicRuleRepository } = loadTypeScriptModule(
  "../src/lib/repositories/app-logic-rule.ts",
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
      appLogicRule: {
        findMany: record("findMany", []),
        count: record("count", 0),
        create: record("create", { id: "rule-1" }),
        updateMany: record("updateMany", { count: 1 }),
        deleteMany: record("deleteMany", { count: 1 }),
        createMany: record("createMany", { count: 2 }),
      },
    },
  };
}

test("App Logic Rule list cannot escape the context business", async () => {
  const mock = createMockClient();
  const rules = createAppLogicRuleRepository(context, mock.client);

  await rules.list({
    businessId: "business-b",
    module: "sales",
  });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", module: "sales" },
    ],
  });
});

test("App Logic Rule create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const rules = createAppLogicRuleRepository(context, mock.client);

  await rules.create({
    businessId: "business-b",
    name: "Sales Rule",
    module: "sales",
    trigger: "beforeSave",
    expression: "total = qty * price",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("App Logic Rule update and delete include the context business", async () => {
  const mock = createMockClient();
  const rules = createAppLogicRuleRepository(context, mock.client);

  assert.equal(await rules.updateById("rule-1", { enabled: false }), true);
  assert.equal(await rules.deleteById("rule-1"), true);

  assert.deepEqual(mock.calls[0].args.where, {
    businessId: "business-a",
    id: "rule-1",
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "rule-1",
  });
});

test("Enabled App Logic selection is tenant scoped", async () => {
  const mock = createMockClient();
  const rules = createAppLogicRuleRepository(context, mock.client);

  await rules.listEnabled("sales", "beforeSave");

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { module: "sales", trigger: "beforeSave", enabled: true },
    ],
  });
  assert.deepEqual(mock.calls[0].args.select, {
    id: true,
    name: true,
    mode: true,
    expression: true,
  });
});

test("Default App Logic bulk creation injects the business into every rule", async () => {
  const mock = createMockClient();
  const rules = createAppLogicRuleRepository(context, mock.client);

  await rules.createMany([
    { name: "One", module: "sales", trigger: "beforeSave", expression: "x = 1" },
    { name: "Two", module: "sales", trigger: "beforeSave", expression: "x = 2" },
  ]);

  assert.deepEqual(
    mock.calls[0].args.data.map((rule) => rule.businessId),
    ["business-a", "business-a"]
  );
});
