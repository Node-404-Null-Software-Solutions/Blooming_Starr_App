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
const { createAppLogicExecutionLogRepository } = loadTypeScriptModule(
  "../src/lib/repositories/app-logic-execution-log.ts",
  (moduleName) => {
    if (moduleName === "@/lib/db") return {};
    if (moduleName === "@/lib/repositories/tenant-scope") return tenantScope;
    throw new Error(`Unexpected execution-log repository import: ${moduleName}`);
  }
);

const context = { businessId: "business-a" };

function createMockClient() {
  const calls = [];
  return {
    calls,
    client: {
      appLogicExecutionLog: {
        createMany: async (args) => {
          calls.push({ operation: "createMany", args });
          return { count: args.data.length };
        },
        findMany: async (args) => {
          calls.push({ operation: "findMany", args });
          return [];
        },
      },
    },
  };
}

test("execution log bulk writes inject the context business", async () => {
  const mock = createMockClient();
  const logs = createAppLogicExecutionLogRepository(context, mock.client);

  await logs.createMany([
    {
      businessId: "business-b",
      ruleId: "rule-a",
      ruleName: "Rule A",
      module: "sales",
      trigger: "beforeSave",
      mode: "FORMULA",
      source: "INTERACTIVE",
      requestId: "request-a",
      actorUserId: "user-a",
      status: "SUCCEEDED",
    },
  ]);

  assert.equal(mock.calls[0].args.data[0].businessId, "business-a");
});

test("recent execution logs are tenant scoped and limit bounded", async () => {
  const mock = createMockClient();
  const logs = createAppLogicExecutionLogRepository(context, mock.client);

  await logs.listRecent(1000);

  assert.deepEqual(mock.calls[0].args.where, { businessId: "business-a" });
  assert.equal(mock.calls[0].args.take, 200);
  assert.deepEqual(mock.calls[0].args.orderBy, { createdAt: "desc" });
});
