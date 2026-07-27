import assert from "node:assert/strict";
import test from "node:test";
import {
  PROTECTED_TABLES,
  resolveIsolationDatabaseTarget,
} from "../scripts/verify-tenant-isolation.mjs";

const safeTarget =
  "postgresql://isolation_user:secret@db.example.test:5432/blooming_starr_ci_test";

test("connected verifier has no default database target", () => {
  assert.throws(
    () => resolveIsolationDatabaseTarget({}),
    /ISOLATION_TEST_DATABASE_URL is required/
  );
});

test("connected verifier requires exact database-name confirmation", () => {
  assert.throws(
    () =>
      resolveIsolationDatabaseTarget({
        ISOLATION_TEST_DATABASE_URL: safeTarget,
        CONFIRM_ISOLATION_TEST_DATABASE: "wrong_database",
      }),
    /must exactly match/
  );
});

test("connected verifier refuses production-like and application databases", () => {
  assert.throws(
    () =>
      resolveIsolationDatabaseTarget({
        ISOLATION_TEST_DATABASE_URL:
          "postgresql://user:secret@db.example.test/blooming_prod",
        CONFIRM_ISOLATION_TEST_DATABASE: "blooming_prod",
      }),
    /test database/
  );
  assert.throws(
    () =>
      resolveIsolationDatabaseTarget({
        ISOLATION_TEST_DATABASE_URL: safeTarget,
        CONFIRM_ISOLATION_TEST_DATABASE: "blooming_starr_ci_test",
        DATABASE_URL: safeTarget,
      }),
    /refuses to use DATABASE_URL/
  );
  assert.throws(
    () =>
      resolveIsolationDatabaseTarget({
        ISOLATION_TEST_DATABASE_URL: safeTarget,
        CONFIRM_ISOLATION_TEST_DATABASE: "blooming_starr_ci_test",
        DATABASE_URL:
          "postgresql://different_user:other@db.example.test:5432/blooming_starr_ci_test",
      }),
    /refuses to use DATABASE_URL/
  );
  assert.throws(
    () =>
      resolveIsolationDatabaseTarget({
        ISOLATION_TEST_DATABASE_URL: safeTarget,
        CONFIRM_ISOLATION_TEST_DATABASE: "blooming_starr_ci_test",
        DATABASE_URL:
          "postgresql://isolation_user:other@db.example.test/blooming_starr_ci_test",
      }),
    /refuses to use DATABASE_URL/
  );
});

test("connected verifier accepts an explicitly confirmed disposable target", () => {
  const target = resolveIsolationDatabaseTarget({
    ISOLATION_TEST_DATABASE_URL: safeTarget,
    CONFIRM_ISOLATION_TEST_DATABASE: "blooming_starr_ci_test",
  });

  assert.equal(target.databaseName, "blooming_starr_ci_test");
});

test("connected verifier covers all classified spreadsheet data tables", () => {
  assert.equal(PROTECTED_TABLES.length, 15);
  assert.equal(new Set(PROTECTED_TABLES).size, PROTECTED_TABLES.length);
  assert.equal(PROTECTED_TABLES.includes("Business"), false);
  assert.equal(PROTECTED_TABLES.includes("Membership"), false);
});
