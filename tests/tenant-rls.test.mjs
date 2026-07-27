import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/lib/tenant-rls.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const tenantRlsModule = { exports: {} };
new Function("exports", "module", compiled)(
  tenantRlsModule.exports,
  tenantRlsModule
);
const { createTenantRlsRuntime } = tenantRlsModule.exports;

const context = {
  requestId: "request-1",
  userId: "user-1",
  membershipId: "membership-1",
  businessId: "business-a",
  businessSlug: "business-a",
  role: "OWNER",
};

function createMockRoot() {
  const calls = [];
  const transaction = {
    $executeRawUnsafe: async (...args) => {
      calls.push({ operation: "execute", args });
      return 0;
    },
    $queryRawUnsafe: async (...args) => {
      calls.push({ operation: "query", args });
      return [];
    },
    salesEntry: {
      findMany: async (...args) => {
        calls.push({ operation: "findMany", args });
        return [{ id: "sale-1" }];
      },
    },
  };
  return {
    calls,
    root: {
      $transaction: async (operation) => {
        calls.push({ operation: "transaction", args: [] });
        return operation(transaction);
      },
    },
  };
}

test("tenant transactions downgrade the role and set transaction-local context", async () => {
  const mock = createMockRoot();
  const runtime = createTenantRlsRuntime(mock.root);

  const result = await runtime.withTenantRlsTransaction(
    context,
    async () => "complete"
  );

  assert.equal(result, "complete");
  assert.deepEqual(
    mock.calls.map((call) => call.operation),
    ["transaction", "execute", "query"]
  );
  assert.match(mock.calls[1].args[0], /^SET LOCAL ROLE/);
  assert.equal(mock.calls[2].args[1], "business-a");
  assert.match(mock.calls[2].args[0], /set_config\('app\.business_id'.*true\)/);
});

test("tenant-scoped delegates run their operation inside the protected transaction", async () => {
  const mock = createMockRoot();
  const runtime = createTenantRlsRuntime(mock.root);
  const client = runtime.createTenantScopedClient(context);

  const rows = await client.salesEntry.findMany({
    where: { businessId: "business-a" },
  });

  assert.deepEqual(rows, [{ id: "sale-1" }]);
  assert.deepEqual(
    mock.calls.map((call) => call.operation),
    ["transaction", "execute", "query", "findMany"]
  );
  assert.deepEqual(mock.calls[3].args[0], {
    where: { businessId: "business-a" },
  });
});

test("tenant-scoped clients do not expose control-plane delegates", () => {
  const mock = createMockRoot();
  const runtime = createTenantRlsRuntime(mock.root);
  const client = runtime.createTenantScopedClient(context);

  assert.throws(() => client.membership, /does not expose membership/);
});

test("tenant activation fails closed before the requested operation", async () => {
  let operationCalled = false;
  const runtime = createTenantRlsRuntime({
    $transaction: async (operation) =>
      operation({
        $executeRawUnsafe: async () => {
          throw new Error("role unavailable");
        },
        $queryRawUnsafe: async () => [],
      }),
  });

  await assert.rejects(
    runtime.withTenantRlsTransaction(context, async () => {
      operationCalled = true;
    }),
    /role unavailable/
  );
  assert.equal(operationCalled, false);
});
