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
const { createTenantRlsRuntime } = loadTypeScriptModule(
  "../src/lib/tenant-rls.ts"
);

const contextA = {
  requestId: "request-a",
  userId: "user-a",
  membershipId: "membership-a",
  businessId: "business-a",
  businessSlug: "business-a",
  role: "OWNER",
};
const contextB = {
  requestId: "request-b",
  userId: "user-b",
  membershipId: "membership-b",
  businessId: "business-b",
  businessSlug: "business-b",
  role: "OWNER",
};

function matchesValue(actual, expected) {
  if (expected === null || typeof expected !== "object") {
    return actual === expected;
  }
  if ("equals" in expected && actual !== expected.equals) return false;
  if ("in" in expected && !expected.in.includes(actual)) return false;
  if ("gte" in expected && actual < expected.gte) return false;
  if ("lte" in expected && actual > expected.lte) return false;
  return true;
}

function matchesWhere(row, where) {
  if (!where) return true;
  if (where.AND && !where.AND.every((part) => matchesWhere(row, part))) {
    return false;
  }
  if (where.OR && !where.OR.some((part) => matchesWhere(row, part))) {
    return false;
  }
  return Object.entries(where)
    .filter(([field]) => field !== "AND" && field !== "OR")
    .every(([field, expected]) => matchesValue(row[field], expected));
}

function createPooledSalesDatabase() {
  const rows = [
    {
      id: "sale-a",
      businessId: "business-a",
      sku: "SHARED-SKU",
      qty: 1,
      salePriceCents: 100,
      createdAt: new Date("2026-01-01"),
    },
    {
      id: "sale-b",
      businessId: "business-b",
      sku: "SHARED-SKU",
      qty: 1,
      salePriceCents: 200,
      createdAt: new Date("2026-01-02"),
    },
  ];
  const activations = [];
  let activeBusinessId = null;
  let roleActive = false;
  let nextId = 1;

  function visibleRows(where) {
    if (!roleActive || !activeBusinessId) return [];
    return rows.filter(
      (row) =>
        row.businessId === activeBusinessId && matchesWhere(row, where)
    );
  }

  function requireWriteScope(data) {
    if (!roleActive || !activeBusinessId || data.businessId !== activeBusinessId) {
      const error = new Error("row-level security policy violation");
      error.code = "42501";
      throw error;
    }
  }

  const transaction = {
    $executeRawUnsafe: async () => {
      roleActive = true;
      return 0;
    },
    $queryRawUnsafe: async (_sql, businessId) => {
      activeBusinessId = businessId;
      activations.push(businessId);
      return [];
    },
    salesEntry: {
      findMany: async ({ where } = {}) => [...visibleRows(where)],
      findFirst: async ({ where } = {}) => visibleRows(where)[0] ?? null,
      create: async ({ data }) => {
        requireWriteScope(data);
        const created = { id: `sale-new-${nextId++}`, ...data };
        rows.push(created);
        return created;
      },
      updateMany: async ({ where, data }) => {
        const matches = visibleRows(where);
        for (const row of matches) Object.assign(row, data);
        return { count: matches.length };
      },
      deleteMany: async ({ where }) => {
        const ids = new Set(visibleRows(where).map((row) => row.id));
        const originalLength = rows.length;
        for (let index = rows.length - 1; index >= 0; index--) {
          if (ids.has(rows[index].id)) rows.splice(index, 1);
        }
        return { count: originalLength - rows.length };
      },
    },
  };

  const root = {
    $transaction: async (operation) => {
      activeBusinessId = null;
      roleActive = false;
      try {
        return await operation(transaction);
      } finally {
        activeBusinessId = null;
        roleActive = false;
      }
    },
  };

  return { activations, root, rows };
}

function createHarness() {
  const database = createPooledSalesDatabase();
  const runtime = createTenantRlsRuntime(database.root);
  const { createSalesRepository } = loadTypeScriptModule(
    "../src/lib/repositories/sales.ts",
    (moduleName) => {
      if (moduleName === "@/lib/db") {
        return {
          createTenantScopedClient: runtime.createTenantScopedClient,
        };
      }
      if (moduleName === "@/lib/repositories/tenant-scope") {
        return tenantScope;
      }
      throw new Error(`Unexpected test import: ${moduleName}`);
    }
  );
  return { createSalesRepository, database, runtime };
}

test("two businesses with the same spreadsheet key see only their own rows", async () => {
  const harness = createHarness();
  const salesA = harness.createSalesRepository(contextA);
  const salesB = harness.createSalesRepository(contextB);

  assert.deepEqual(
    (await salesA.list()).map((row) => row.id),
    ["sale-a"]
  );
  assert.deepEqual(
    (await salesB.list()).map((row) => row.id),
    ["sale-b"]
  );
  assert.deepEqual(harness.database.activations, ["business-a", "business-b"]);
});

test("conflicting filters and record IDs cannot cross businesses", async () => {
  const harness = createHarness();
  const salesA = harness.createSalesRepository(contextA);

  assert.deepEqual(await salesA.list({ businessId: "business-b" }), []);
  assert.equal(await salesA.findById("sale-b"), null);
  assert.equal(
    await salesA.updateById("sale-b", { salePriceCents: 99999 }),
    false
  );
  assert.equal(await salesA.deleteById("sale-b"), false);

  const businessBRow = harness.database.rows.find((row) => row.id === "sale-b");
  assert.equal(businessBRow.salePriceCents, 200);
});

test("runtime-supplied business IDs are overwritten before protected writes", async () => {
  const harness = createHarness();
  const salesA = harness.createSalesRepository(contextA);

  const created = await salesA.create({
    businessId: "business-b",
    sku: "NEW-SKU",
    qty: 1,
    salePriceCents: 500,
  });

  assert.equal(created.businessId, "business-a");
  assert.equal(
    harness.database.rows.some(
      (row) => row.sku === "NEW-SKU" && row.businessId === "business-b"
    ),
    false
  );
});

test("missing context and rolled-back work do not leak through a reused connection", async () => {
  const harness = createHarness();

  const unscopedRows = await harness.database.root.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE "blooming_starr_tenant"');
    return tx.salesEntry.findMany({});
  });
  assert.deepEqual(unscopedRows, []);

  await assert.rejects(
    harness.runtime.withTenantRlsTransaction(contextA, async () => {
      throw new Error("rollback");
    }),
    /rollback/
  );

  const salesB = harness.createSalesRepository(contextB);
  assert.deepEqual(
    (await salesB.list()).map((row) => row.id),
    ["sale-b"]
  );
  assert.equal(harness.database.activations.at(-1), "business-b");
});
