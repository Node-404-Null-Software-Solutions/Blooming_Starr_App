import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

test("Sales schema and migration persist customer name and status", () => {
  const schema = read("../prisma/schema.prisma");
  const model = schema.slice(
    schema.indexOf("model SalesEntry"),
    schema.indexOf("model FertilizerLog")
  );
  assert.match(model, /customerName\s+String\?/);
  assert.match(model, /status\s+String\s+@default\("Sold"\)/);

  const migration = read(
    "../prisma/migrations/20260727000002_add_sales_customer_status/migration.sql"
  );
  assert.match(migration, /"customerName" TEXT/);
  assert.match(migration, /"status" TEXT NOT NULL DEFAULT 'Sold'/);
});

test("Sales create, update, and import paths carry both persisted fields", () => {
  const actions = read("../src/lib/actions/data-entries.ts");
  assert.match(actions, /customerName\?: string \| null/);
  assert.match(actions, /status\?: string/);
  assert.match(
    actions,
    /customerName: formStr\(formData, "customerName"\) \|\| null/
  );
  assert.match(actions, /status: formStr\(formData, "status"\) \|\| "Sold"/);

  const importer = read("../src/lib/actions/import.ts");
  assert.match(importer, /col\("Customer Name", "Customer"\)/);
  assert.match(importer, /col\("Status", "Sale Status"\)/);
  assert.match(importer, /customerName: cCustomerName/);
  assert.match(importer, /status: cStatus/);
});

test("Sales list and detail render stored customer name and status", () => {
  const page = read(
    "../src/app/(app)/app/[businessSlug]/sales/page.tsx"
  );
  assert.match(page, /customerName: row\.customerName/);
  assert.match(page, /status: row\.status/);
  assert.match(page, /customerName: \{ contains: qRaw/);
  assert.match(page, /status: \{ contains: qRaw/);

  const table = read(
    "../src/app/(app)/app/[businessSlug]/sales/SalesDataTable.tsx"
  );
  assert.match(table, /renderCell\(row, "customerName"\)/);
  assert.match(table, /renderCell\(row, "status"\)/);
  assert.doesNotMatch(table, />Sold<\/td>/);

  const moduleClient = read(
    "../src/app/(app)/app/[businessSlug]/sales/SalesModuleClient.tsx"
  );
  assert.match(moduleClient, /label: "Customer Name"/);
  assert.match(moduleClient, /label: "Status"/);
});
