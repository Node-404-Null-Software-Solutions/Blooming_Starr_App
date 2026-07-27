import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = [
  "20260717000001_enable_tenant_rls",
  "20260717000002_add_app_logic_execution_logs",
]
  .map((directory) =>
    readFileSync(
      new URL(`../prisma/migrations/${directory}/migration.sql`, import.meta.url),
      "utf8"
    )
  )
  .join("\n");

const protectedTables = [
  "AppLogicExecutionLog",
  "AppLogicRule",
  "Employee",
  "FertilizerLog",
  "LookupEntry",
  "OverheadExpense",
  "PlantIntake",
  "PlantSkuReference",
  "PricingEntry",
  "Product",
  "ProductIntake",
  "SalesEntry",
  "ScheduleEntry",
  "TransplantLog",
  "TreatmentTracking",
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("RLS migration creates a non-bypass tenant role", () => {
  assert.match(migration, /CREATE ROLE blooming_starr_tenant/);
  assert.match(migration, /NOLOGIN/);
  assert.match(migration, /NOSUPERUSER/);
  assert.match(migration, /NOBYPASSRLS/);
  assert.match(migration, /GRANT %I TO %I/);
});

test("every spreadsheet data table enables and forces RLS", () => {
  for (const table of protectedTables) {
    const escapedTable = escapeRegex(table);
    assert.match(
      migration,
      new RegExp(`ALTER TABLE "${escapedTable}" ENABLE ROW LEVEL SECURITY;`)
    );
    assert.match(
      migration,
      new RegExp(`ALTER TABLE "${escapedTable}" FORCE ROW LEVEL SECURITY;`)
    );
    assert.match(
      migration,
      new RegExp(
        `CREATE POLICY tenant_business_isolation ON "${escapedTable}"[\\s\\S]*?WITH CHECK`
      )
    );
  }
});

test("RLS policies fail closed without transaction-local business context", () => {
  const policyContextReads = migration.match(
    /current_setting\('app\.business_id', true\)/g
  );

  assert.equal(policyContextReads?.length, protectedTables.length * 2);
  assert.doesNotMatch(migration, /current_setting\('app\.business_id'\)(?!,)/);
  assert.match(migration, /FOR ALL TO blooming_starr_tenant/);
});

test("the scoped role receives access only to classified data-plane tables", () => {
  const grants = [
    ...migration.matchAll(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE([\s\S]*?)TO blooming_starr_tenant;/g
    ),
  ].map((match) => match[1]).join("\n");
  assert.ok(grants);

  for (const table of protectedTables) {
    assert.match(grants, new RegExp(`"${escapeRegex(table)}"`));
  }
  assert.doesNotMatch(
    grants,
    /"(?:Business|BusinessLogo|Membership|JoinRequest|PendingMemberInvite|PendingCoOwnerInvite)"/
  );
});
