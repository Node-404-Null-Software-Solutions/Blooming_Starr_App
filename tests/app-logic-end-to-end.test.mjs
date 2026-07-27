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

function createHarness() {
  const rules = new Map([
    [
      "business-a",
      [
        {
          id: "a-calculate",
          name: "A calculate sale",
          module: "sales",
          trigger: "manual",
          mode: "FORMULA",
          expression: [
            "totalSaleCents = qty * salePriceCents",
            "profitCents = totalSaleCents - costCents",
          ].join("\n"),
          enabled: true,
          sortOrder: 0,
        },
        {
          id: "a-sync",
          name: "A sync product",
          module: "sales",
          trigger: "manual",
          mode: "SCRIPT",
          expression: "ACTION SYNC_PRODUCT_MASTER",
          enabled: true,
          sortOrder: 1,
        },
      ],
    ],
    [
      "business-b",
      [
        {
          id: "b-calculate",
          name: "B calculate sale",
          module: "sales",
          trigger: "manual",
          mode: "FORMULA",
          expression: [
            "totalSaleCents = qty * salePriceCents + 100",
            "profitCents = totalSaleCents - costCents",
          ].join("\n"),
          enabled: true,
          sortOrder: 0,
        },
        {
          id: "b-sync",
          name: "B sync product",
          module: "sales",
          trigger: "manual",
          mode: "SCRIPT",
          expression: "ACTION SYNC_PRODUCT_MASTER",
          enabled: true,
          sortOrder: 1,
        },
      ],
    ],
  ]);
  const salesRows = new Map([
    [
      "business-a",
      new Map([
        [
          "sale-a",
          {
            id: "sale-a",
            sku: "SHARED-SKU",
            itemName: "Business A product",
            qty: 2,
            salePriceCents: 1500,
            costCents: 700,
            totalSaleCents: 0,
            profitCents: 0,
            marginPct: 0,
          },
        ],
      ]),
    ],
    [
      "business-b",
      new Map([
        [
          "sale-b",
          {
            id: "sale-b",
            sku: "SHARED-SKU",
            itemName: "Business B product",
            qty: 3,
            salePriceCents: 900,
            costCents: 400,
            totalSaleCents: 0,
            profitCents: 0,
            marginPct: 0,
          },
        ],
      ]),
    ],
  ]);
  const products = new Map([
    ["business-a", new Map()],
    ["business-b", new Map()],
  ]);
  const executionLogs = new Map([
    ["business-a", []],
    ["business-b", []],
  ]);

  const contract = loadTypeScriptModule("../src/lib/app-logic-contract.ts");
  const runtime = loadTypeScriptModule(
    "../src/lib/app-logic-runtime.ts",
    (moduleName) => {
      if (moduleName === "@/lib/app-logic-contract") return contract;
      throw new Error(`Unexpected integrated runtime import: ${moduleName}`);
    }
  );
  const engine = loadTypeScriptModule(
    "../src/lib/app-logic-engine.ts",
    (moduleName) => {
      if (moduleName === "@/lib/app-logic-contract") return contract;
      if (moduleName === "@/lib/app-logic-runtime") return runtime;
      if (moduleName === "@/lib/repositories/app-logic-rule") {
        return {
          createAppLogicRuleRepository: (context) => ({
            countAll: async () => rules.get(context.businessId).length,
            createMany: async (data) => {
              rules.set(context.businessId, [...data]);
              return { count: data.length };
            },
            listEnabled: async (module, trigger) =>
              rules
                .get(context.businessId)
                .filter(
                  (rule) =>
                    rule.enabled &&
                    rule.module === module &&
                    rule.trigger === trigger
                )
                .sort((left, right) => left.sortOrder - right.sortOrder),
          }),
        };
      }
      throw new Error(`Unexpected integrated engine import: ${moduleName}`);
    }
  );
  const audit = loadTypeScriptModule(
    "../src/lib/app-logic-audit.ts",
    (moduleName) => {
      if (moduleName === "@/lib/app-logic-engine") return engine;
      if (moduleName === "@/lib/repositories/app-logic-execution-log") {
        return {
          createAppLogicExecutionLogRepository: (context) => ({
            createMany: async (data) => {
              executionLogs
                .get(context.businessId)
                .push(
                  ...data.map((entry) => ({
                    ...entry,
                    businessId: context.businessId,
                  }))
                );
              return { count: data.length };
            },
          }),
        };
      }
      throw new Error(`Unexpected integrated audit import: ${moduleName}`);
    }
  );
  const broker = loadTypeScriptModule(
    "../src/lib/app-logic-action-broker.ts",
    (moduleName) => {
      if (moduleName === "@/lib/app-logic-contract") return contract;
      if (moduleName === "@/lib/app-logic-audit") return audit;
      if (moduleName === "@/lib/repositories/product") {
        return {
          createProductRepository: (context) => ({
            upsertBySku: async (sku, create, update) => {
              const tenantProducts = products.get(context.businessId);
              const current = tenantProducts.get(sku);
              tenantProducts.set(sku, current ? { ...current, ...update } : { sku, ...create });
            },
          }),
        };
      }
      throw new Error(`Unexpected integrated broker import: ${moduleName}`);
    }
  );
  const rowService = loadTypeScriptModule(
    "../src/lib/app-logic-row-service.ts",
    (moduleName) => {
      if (moduleName === "@/lib/app-logic-contract") return contract;
      if (moduleName === "@/lib/app-logic-engine") return engine;
      if (moduleName === "@/lib/app-logic-audit") return audit;
      if (moduleName === "@/lib/app-logic-action-broker") return broker;
      if (moduleName === "@/lib/repositories/sales") {
        return {
          createSalesRepository: (context) => ({
            findById: async (id) => salesRows.get(context.businessId).get(id) ?? null,
            updateById: async (id, data) => {
              const tenantRows = salesRows.get(context.businessId);
              const row = tenantRows.get(id);
              if (!row) return false;
              Object.assign(row, data);
              return true;
            },
          }),
        };
      }
      if (moduleName === "@/lib/repositories/product-intake") {
        return { createProductIntakeRepository: () => ({}) };
      }
      if (moduleName === "@/lib/repositories/overhead-expense") {
        return { createOverheadExpenseRepository: () => ({}) };
      }
      throw new Error(`Unexpected integrated row-service import: ${moduleName}`);
    }
  );

  return { executionLogs, products, rowService, salesRows };
}

test("manual formula, script, governed action, and audit remain isolated by business", async () => {
  const harness = createHarness();

  const resultA = await harness.rowService.runManualAppLogicForRow(
    contextA,
    "sales",
    "sale-a"
  );
  const resultB = await harness.rowService.runManualAppLogicForRow(
    contextB,
    "sales",
    "sale-b"
  );

  assert.equal(resultA.scope.totalSaleCents, 3000);
  assert.equal(resultB.scope.totalSaleCents, 2800);
  assert.equal(
    harness.salesRows.get("business-a").get("sale-a").profitCents,
    2300
  );
  assert.equal(
    harness.salesRows.get("business-b").get("sale-b").profitCents,
    2400
  );
  assert.deepEqual(harness.products.get("business-a").get("SHARED-SKU"), {
    sku: "SHARED-SKU",
    productName: "Business A product",
    defaultCostCents: 700,
    defaultSalePriceCents: 1500,
  });
  assert.deepEqual(harness.products.get("business-b").get("SHARED-SKU"), {
    sku: "SHARED-SKU",
    productName: "Business B product",
    defaultCostCents: 400,
    defaultSalePriceCents: 900,
  });
  assert.deepEqual(
    harness.executionLogs
      .get("business-a")
      .map((entry) => [entry.businessId, entry.ruleId, entry.actorUserId]),
    [
      ["business-a", "a-calculate", "user-a"],
      ["business-a", "a-sync", "user-a"],
    ]
  );
  assert.deepEqual(
    harness.executionLogs
      .get("business-b")
      .map((entry) => [entry.businessId, entry.ruleId, entry.actorUserId]),
    [
      ["business-b", "b-calculate", "user-b"],
      ["business-b", "b-sync", "user-b"],
    ]
  );
});

test("a row ID from another business is invisible and causes no writes or audits", async () => {
  const harness = createHarness();
  const beforeB = structuredClone(
    harness.salesRows.get("business-b").get("sale-b")
  );

  const result = await harness.rowService.runManualAppLogicForRow(
    contextA,
    "sales",
    "sale-b"
  );

  assert.deepEqual(result, { found: false });
  assert.deepEqual(
    harness.salesRows.get("business-b").get("sale-b"),
    beforeB
  );
  assert.equal(harness.products.get("business-a").size, 0);
  assert.equal(harness.executionLogs.get("business-a").length, 0);
  assert.equal(harness.executionLogs.get("business-b").length, 0);
});
