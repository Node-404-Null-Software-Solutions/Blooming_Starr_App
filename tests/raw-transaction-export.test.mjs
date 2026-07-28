import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

function loadTypeScriptModule(relativeUrl) {
  const source = read(relativeUrl);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "module", compiled)(
    loadedModule.exports,
    loadedModule
  );
  return loadedModule.exports;
}

const { buildRawTransactionsCsv } = loadTypeScriptModule(
  "../src/lib/raw-transaction-export.ts"
);

test("raw transaction CSV contains individual sales and overhead records", () => {
  const csv = buildRawTransactionsCsv({
    businessName: "Blooming, Starr",
    year: 2026,
    sales: [
      {
        id: "sale-1",
        date: new Date("2026-07-02T00:00:00.000Z"),
        sku: "PLANT-1",
        customerName: "=1+1",
        itemName: "Monstera",
        status: "Sold",
        qty: 2,
        salePriceCents: 1250,
        totalSaleCents: 2500,
        paymentMethod: "Card",
        cardLast4: "1002",
        channel: "Market",
        costCents: 900,
        profitCents: 1600,
        marginPct: 64,
        notes: "Line one\n\"quoted\"",
        externalUid: "sale-external",
        createdAt: new Date("2026-07-02T10:00:00.000Z"),
        updatedAt: new Date("2026-07-02T11:00:00.000Z"),
      },
    ],
    overheadExpenses: [
      {
        id: "expense-1",
        date: new Date("2026-07-01T00:00:00.000Z"),
        vendor: "@vendor",
        brand: "Brand",
        category: "Supplies",
        description: "Soil",
        qty: 1,
        subTotalCents: 1000,
        shippingCents: 250,
        discountCents: 100,
        unitCostCents: 900,
        totalCents: 1150,
        paymentMethod: "Cash",
        cardLast4: null,
        invoiceNumber: "INV-1",
        notes: null,
        externalUid: "expense-external",
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
        updatedAt: new Date("2026-07-01T11:00:00.000Z"),
      },
    ],
  });

  assert.match(csv, /^Business,Year,Transaction Type,Record ID,/);
  assert.match(csv, /"Blooming, Starr",2026,Sale,sale-1/);
  assert.match(csv, /"Blooming, Starr",2026,Overhead Expense,expense-1/);
  assert.ok(csv.indexOf("expense-1") < csv.indexOf("sale-1"));
  assert.match(csv, /,'=1\+1,/);
  assert.match(csv, /,'@vendor,/);
  assert.match(csv, /12\.5,25,9,16,64/);
  assert.match(csv, /10,2\.5,1,9,11\.5/);
  assert.match(csv, /"Line one\n""quoted"""/);
  assert.doesNotMatch(csv, /businessId/);
});

test("raw transaction route is authenticated, tenant-scoped, and non-cacheable", () => {
  const route = read(
    "../src/app/api/export/[businessSlug]/transactions/route.ts"
  );

  assert.match(route, /requireBusinessMembership\(businessSlug\)/);
  assert.match(route, /sales\.listForRawExport\(yearWhere\)/);
  assert.match(route, /overheadExpenses\.listForRawExport\(yearWhere\)/);
  assert.match(route, /buildRawTransactionsCsv\(/);
  assert.match(route, /\\uFEFF/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  assert.match(route, /raw-transactions-\$\{year\}\.csv/);
});

test("Dashboard exposes both summary and raw transaction exports", () => {
  const page = read("../src/app/(app)/app/[businessSlug]/page.tsx");
  const button = read(
    "../src/app/(app)/app/[businessSlug]/ExportRawTransactionsButton.tsx"
  );

  assert.match(page, /ExportRawTransactionsButton/);
  assert.match(page, /ExportTaxSummaryButton/);
  assert.match(
    button,
    /\/api\/export\/\$\{encodeURIComponent\(\s*businessSlug\s*\)\}\/transactions\?year=\$\{year\}/
  );
  assert.match(button, /Export transactions \(CSV\)/);
});
