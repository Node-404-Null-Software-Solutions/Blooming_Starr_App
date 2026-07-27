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
const { createEmployeeRepository } = loadTypeScriptModule(
  "../src/lib/repositories/employee.ts",
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
      employee: {
        findMany: record("findMany", []),
        findFirst: record("findFirst", null),
        create: record("create", { id: "employee-1" }),
        updateMany: record("updateMany", { count: 1 }),
      },
    },
  };
}

test("Employee list cannot escape the context business", async () => {
  const mock = createMockClient();
  const employees = createEmployeeRepository(context, mock.client);

  await employees.list({
    businessId: "business-b",
    status: "ACTIVE",
  });

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [
      { businessId: "business-a" },
      { businessId: "business-b", status: "ACTIVE" },
    ],
  });
});

test("Employee create overwrites a runtime-supplied business", async () => {
  const mock = createMockClient();
  const employees = createEmployeeRepository(context, mock.client);

  await employees.create({
    businessId: "business-b",
    name: "Employee One",
  });

  assert.equal(mock.calls[0].args.data.businessId, "business-a");
});

test("Employee lookup and update include the context business", async () => {
  const mock = createMockClient();
  const employees = createEmployeeRepository(context, mock.client);

  await employees.findById("employee-1");
  assert.equal(await employees.updateById("employee-1", { status: "INACTIVE" }), true);

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [{ businessId: "business-a" }, { id: "employee-1" }],
  });
  assert.deepEqual(mock.calls[1].args.where, {
    businessId: "business-a",
    id: "employee-1",
  });
});

test("Schedule employee options include only active employees in the context business", async () => {
  const mock = createMockClient();
  const employees = createEmployeeRepository(context, mock.client);

  await employees.listActiveForSchedule();

  assert.deepEqual(mock.calls[0].args.where, {
    AND: [{ businessId: "business-a" }, { status: "ACTIVE" }],
  });
  assert.deepEqual(mock.calls[0].args.select, { id: true, name: true });
});
