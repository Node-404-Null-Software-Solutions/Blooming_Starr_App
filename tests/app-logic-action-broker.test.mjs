import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadBroker(createProductRepository) {
  const source = readFileSync(
    new URL("../src/lib/app-logic-action-broker.ts", import.meta.url),
    "utf8"
  );
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
    (moduleName) => {
      if (moduleName === "@/lib/app-logic-contract") {
        return {
          APP_LOGIC_MODULE_ACTIONS: {
            sales: ["SYNC_PRODUCT_MASTER"],
            productIntake: ["SYNC_PRODUCT_MASTER"],
            overheadExpenses: [],
            transplantLog: [],
          },
        };
      }
      if (moduleName === "@/lib/repositories/product") {
        return { createProductRepository };
      }
      if (moduleName === "@/lib/app-logic-audit") {
        return { persistAppLogicExecutionAudit: async () => {} };
      }
      throw new Error(`Unexpected broker test import: ${moduleName}`);
    }
  );
  return loadedModule.exports;
}

const intent = {
  action: "SYNC_PRODUCT_MASTER",
  line: 2,
  ruleId: "rule-a",
  ruleName: "Sync product",
  module: "sales",
  trigger: "afterSave",
};

test("governed product sync uses the current tenant repository", async () => {
  const calls = [];
  const context = { businessId: "business-a" };
  const client = { product: {} };
  const broker = loadBroker((receivedContext, receivedClient) => {
    calls.push({ operation: "repository", receivedContext, receivedClient });
    return {
      upsertBySku: async (sku, create, update) => {
        calls.push({ operation: "upsert", sku, create, update });
      },
    };
  });

  const results = await broker.executeGovernedAppLogicActions(
    context,
    {
      module: "sales",
      rowId: "sale-a",
      sku: "SKU-A",
      productName: "Plant A",
      defaultCostCents: 700,
      defaultSalePriceCents: 1500,
    },
    [intent],
    client
  );

  assert.equal(calls[0].receivedContext, context);
  assert.equal(calls[0].receivedClient, client);
  assert.deepEqual(calls[1], {
    operation: "upsert",
    sku: "SKU-A",
    create: {
      productName: "Plant A",
      defaultCostCents: 700,
      defaultSalePriceCents: 1500,
    },
    update: {
      productName: "Plant A",
      defaultCostCents: 700,
      defaultSalePriceCents: 1500,
    },
  });
  assert.deepEqual(results, [
    {
      action: "SYNC_PRODUCT_MASTER",
      ruleId: "rule-a",
      target: "Product",
      targetKey: "SKU-A",
    },
  ]);
});

test("broker rejects a rule intent from another module", async () => {
  let wrote = false;
  const broker = loadBroker(() => ({
    upsertBySku: async () => {
      wrote = true;
    },
  }));

  await assert.rejects(
    broker.executeGovernedAppLogicActions(
      { businessId: "business-a" },
      {
        module: "productIntake",
        rowId: "row-a",
        sku: "SKU-A",
        productName: "Product",
        defaultCostCents: 100,
      },
      [intent]
    ),
    /different source module/
  );
  assert.equal(wrote, false);
});

test("broker rejects blank target keys before a cross-table write", async () => {
  let wrote = false;
  const broker = loadBroker(() => ({
    upsertBySku: async () => {
      wrote = true;
    },
  }));

  await assert.rejects(
    broker.executeGovernedAppLogicActions(
      { businessId: "business-a" },
      {
        module: "sales",
        rowId: "row-a",
        sku: " ",
        productName: null,
        defaultCostCents: 0,
      },
      [intent]
    ),
    /requires a source SKU/
  );
  assert.equal(wrote, false);
});
