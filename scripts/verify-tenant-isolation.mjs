import "dotenv/config";

import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";

const { Pool } = pg;

export const TENANT_DATABASE_ROLE = "blooming_starr_tenant";
export const PROTECTED_TABLES = Object.freeze([
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
]);

function fail(message) {
  throw new Error(message);
}

function databaseIdentity(connectionString) {
  const url = new URL(connectionString);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    fail("Isolation verification requires a PostgreSQL connection string.");
  }
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!databaseName) fail("The isolation database name is missing.");
  return {
    databaseName,
    identity: `${url.protocol}//${url.hostname}:${url.port || "5432"}/${databaseName}`,
  };
}

export function resolveIsolationDatabaseTarget(environment = process.env) {
  const connectionString = environment.ISOLATION_TEST_DATABASE_URL?.trim();
  if (!connectionString) {
    fail("ISOLATION_TEST_DATABASE_URL is required; no fallback database is used.");
  }

  const target = databaseIdentity(connectionString);
  if (!/(?:test|testing|ci|sandbox)/i.test(target.databaseName)) {
    fail("Isolation verification is restricted to an explicitly named test database.");
  }
  if (/prod(?:uction)?/i.test(target.databaseName)) {
    fail("Isolation verification refuses production-like database names.");
  }

  const confirmation = environment.CONFIRM_ISOLATION_TEST_DATABASE?.trim();
  if (confirmation !== target.databaseName) {
    fail(
      "CONFIRM_ISOLATION_TEST_DATABASE must exactly match the test database name."
    );
  }

  if (environment.DATABASE_URL) {
    const applicationTarget = databaseIdentity(environment.DATABASE_URL);
    if (applicationTarget.identity === target.identity) {
      fail("Isolation verification refuses to use DATABASE_URL as its test target.");
    }
  }

  return { connectionString, databaseName: target.databaseName };
}

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function withTenantScope(client, businessId, operation) {
  await client.query("BEGIN");
  try {
    await client.query(`SET LOCAL ROLE "${TENANT_DATABASE_ROLE}"`);
    await client.query(
      "SELECT set_config('app.business_id', $1, true)",
      [businessId]
    );
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function withTenantRoleWithoutContext(client, operation) {
  await client.query("BEGIN");
  try {
    await client.query(`SET LOCAL ROLE "${TENANT_DATABASE_ROLE}"`);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function verifyDatabaseConfiguration(client) {
  const roleResult = await client.query(
    `SELECT rolcanlogin, rolsuper, rolbypassrls
       FROM pg_roles
      WHERE rolname = $1`,
    [TENANT_DATABASE_ROLE]
  );
  if (roleResult.rowCount !== 1) fail("The tenant database role does not exist.");
  const role = roleResult.rows[0];
  if (role.rolcanlogin || role.rolsuper || role.rolbypassrls) {
    fail("The tenant database role has unsafe PostgreSQL attributes.");
  }

  const membership = await client.query(
    "SELECT pg_has_role(current_user, $1, 'MEMBER') AS allowed",
    [TENANT_DATABASE_ROLE]
  );
  if (!membership.rows[0]?.allowed) {
    fail("The runtime database user cannot SET ROLE to the tenant role.");
  }

  for (const table of PROTECTED_TABLES) {
    const rls = await client.query(
      `SELECT c.relrowsecurity, c.relforcerowsecurity
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = $1`,
      [table]
    );
    if (
      rls.rowCount !== 1 ||
      !rls.rows[0].relrowsecurity ||
      !rls.rows[0].relforcerowsecurity
    ) {
      fail(`${table} does not have enabled and forced RLS.`);
    }

    const policy = await client.query(
      `SELECT roles, cmd, qual, with_check
         FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = $1
          AND policyname = 'tenant_business_isolation'`,
      [table]
    );
    const row = policy.rows[0];
    if (
      policy.rowCount !== 1 ||
      row.cmd !== "ALL" ||
      !row.roles.includes(TENANT_DATABASE_ROLE) ||
      !row.qual?.includes("app.business_id") ||
      !row.with_check?.includes("app.business_id")
    ) {
      fail(`${table} has an incomplete tenant isolation policy.`);
    }

    const privilege = await client.query(
      `SELECT has_table_privilege($1, $2, 'SELECT')
           AND has_table_privilege($1, $2, 'INSERT')
           AND has_table_privilege($1, $2, 'UPDATE')
           AND has_table_privilege($1, $2, 'DELETE') AS allowed`,
      [TENANT_DATABASE_ROLE, `public.${quoteIdentifier(table)}`]
    );
    if (!privilege.rows[0]?.allowed) {
      fail(`${TENANT_DATABASE_ROLE} lacks required access to ${table}.`);
    }
  }
}

function createBusinessFixture(runId, suffix) {
  return {
    id: `${runId}-business-${suffix}`,
    name: `Isolation ${suffix.toUpperCase()}`,
    slug: `isolation-${runId}-${suffix}`,
    ownerId: `isolation-owner-${suffix}`,
  };
}

function createDataFixtures(businessId, idSuffix, keyVariant = "shared") {
  const now = new Date();
  const key = `ISOLATION-${keyVariant.toUpperCase()}`;
  const id = (name) => `${idSuffix}-${name}`;
  const employeeId = id("employee");

  return [
    {
      table: "AppLogicExecutionLog",
      data: {
        id: id("logic-log"),
        businessId,
        ruleId: id("logic"),
        ruleName: key,
        module: "sales",
        trigger: "beforeSave",
        mode: "FORMULA",
        source: "INTERACTIVE",
        requestId: id("request"),
        actorUserId: id("actor"),
        status: "SUCCEEDED",
        updatedAt: now,
      },
    },
    {
      table: "AppLogicRule",
      data: {
        id: id("logic"),
        businessId,
        name: key,
        module: "SALES",
        trigger: "BEFORE_SAVE",
        expression: "qty * salePriceCents",
        updatedAt: now,
      },
    },
    {
      table: "Employee",
      data: { id: employeeId, businessId, name: key, updatedAt: now },
    },
    {
      table: "FertilizerLog",
      data: { id: id("fertilizer"), businessId, updatedAt: now },
    },
    {
      table: "LookupEntry",
      data: {
        id: id("lookup"),
        businessId,
        table: "origin",
        name: key,
        code: key.replaceAll("-", ""),
        updatedAt: now,
      },
    },
    {
      table: "OverheadExpense",
      data: { id: id("overhead"), businessId, updatedAt: now },
    },
    {
      table: "PlantIntake",
      data: {
        id: id("plant-intake"),
        businessId,
        source: "TEST",
        genus: "Isolation",
        cultivar: keyVariant,
        sku: key,
        updatedAt: now,
      },
    },
    {
      table: "PlantSkuReference",
      data: {
        id: id("plant-reference"),
        businessId,
        scope: "plant",
        displayName: key,
        normalizedName: key,
        code: key.replaceAll("-", ""),
        updatedAt: now,
      },
    },
    {
      table: "PricingEntry",
      data: { id: id("pricing"), businessId, sku: key, updatedAt: now },
    },
    {
      table: "Product",
      data: { id: id("product"), businessId, sku: key, updatedAt: now },
    },
    {
      table: "ProductIntake",
      data: {
        id: id("product-intake"),
        businessId,
        sku: key,
        updatedAt: now,
      },
    },
    {
      table: "SalesEntry",
      data: { id: id("sales"), businessId, sku: key, updatedAt: now },
    },
    {
      table: "ScheduleEntry",
      data: {
        id: id("schedule"),
        businessId,
        employeeId,
        date: now,
        startTime: "08:00",
        endTime: "09:00",
        updatedAt: now,
      },
    },
    {
      table: "TransplantLog",
      data: { id: id("transplant"), businessId, updatedAt: now },
    },
    {
      table: "TreatmentTracking",
      data: { id: id("treatment"), businessId, sku: key, updatedAt: now },
    },
  ];
}

async function insertFixture(client, fixture) {
  const columns = Object.keys(fixture.data);
  const values = Object.values(fixture.data);
  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  await client.query(
    `INSERT INTO ${quoteIdentifier(fixture.table)}
      (${columns.map(quoteIdentifier).join(", ")})
     VALUES (${placeholders})`,
    values
  );
}

async function insertBusiness(client, business) {
  await client.query(
    `INSERT INTO "Business"
      ("id", "name", "slug", "ownerId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [business.id, business.name, business.slug, business.ownerId]
  );
}

async function seedTenant(client, business, fixtures, createdBusinesses) {
  await insertBusiness(client, business);
  createdBusinesses.push(business);
  await withTenantScope(client, business.id, async (scopedClient) => {
    for (const fixture of fixtures) await insertFixture(scopedClient, fixture);
  });
}

async function visibleIds(client, table, fixtureIds) {
  const result = await client.query(
    `SELECT "id" FROM ${quoteIdentifier(table)}
      WHERE "id" = ANY($1::text[])
      ORDER BY "id"`,
    [fixtureIds]
  );
  return result.rows.map((row) => row.id);
}

async function verifyVisibility(client, business, ownFixtures, otherFixtures) {
  const ownByTable = new Map(ownFixtures.map((fixture) => [fixture.table, fixture]));
  const otherByTable = new Map(
    otherFixtures.map((fixture) => [fixture.table, fixture])
  );

  await withTenantScope(client, business.id, async (scopedClient) => {
    for (const table of PROTECTED_TABLES) {
      const ownId = ownByTable.get(table).data.id;
      const otherId = otherByTable.get(table).data.id;
      const ids = await visibleIds(scopedClient, table, [ownId, otherId]);
      if (ids.length !== 1 || ids[0] !== ownId) {
        fail(`${table} leaked rows while scoped to ${business.id}.`);
      }
    }
  });
}

async function expectInsertDenied(client, businessA, fixture) {
  try {
    await withTenantScope(client, businessA.id, (scopedClient) =>
      insertFixture(scopedClient, fixture)
    );
  } catch (error) {
    if (error?.code === "42501") return;
    throw error;
  }
  fail(`${fixture.table} accepted a cross-business insert.`);
}

async function verifyCrossBusinessMutations(
  client,
  businessA,
  businessBFixtures,
  attackFixtures
) {
  const businessBByTable = new Map(
    businessBFixtures.map((fixture) => [fixture.table, fixture])
  );

  for (const fixture of attackFixtures) {
    if (fixture.table === "ScheduleEntry") {
      fixture.data.employeeId = businessBByTable.get("Employee").data.id;
    }
    await expectInsertDenied(client, businessA, fixture);
  }

  await withTenantScope(client, businessA.id, async (scopedClient) => {
    for (const table of PROTECTED_TABLES) {
      const targetId = businessBByTable.get(table).data.id;
      const update = await scopedClient.query(
        `UPDATE ${quoteIdentifier(table)}
            SET "updatedAt" = NOW()
          WHERE "id" = $1`,
        [targetId]
      );
      if (update.rowCount !== 0) fail(`${table} allowed a cross-business update.`);

      const deletion = await scopedClient.query(
        `DELETE FROM ${quoteIdentifier(table)} WHERE "id" = $1`,
        [targetId]
      );
      if (deletion.rowCount !== 0) fail(`${table} allowed a cross-business delete.`);
    }
  });
}

async function verifyMissingContext(client, allFixtureIds) {
  await withTenantRoleWithoutContext(client, async (scopedClient) => {
    for (const table of PROTECTED_TABLES) {
      const ids = await visibleIds(scopedClient, table, allFixtureIds.get(table));
      if (ids.length !== 0) fail(`${table} returned rows without tenant context.`);
    }
  });
}

async function verifyMissingContextWrite(client, fixture) {
  try {
    await withTenantRoleWithoutContext(client, (scopedClient) =>
      insertFixture(scopedClient, fixture)
    );
  } catch (error) {
    if (error?.code === "42501") return;
    throw error;
  }
  fail(`${fixture.table} accepted a write without tenant context.`);
}

async function cleanup(client, businesses) {
  const cleanupTables = [
    "ScheduleEntry",
    ...PROTECTED_TABLES.filter(
      (table) => table !== "ScheduleEntry" && table !== "Employee"
    ),
    "Employee",
  ];

  for (const business of businesses) {
    await withTenantScope(client, business.id, async (scopedClient) => {
      for (const table of cleanupTables) {
        await scopedClient.query(
          `DELETE FROM ${quoteIdentifier(table)} WHERE "businessId" = $1`,
          [business.id]
        );
      }
    });
  }
  await client.query('DELETE FROM "Business" WHERE "id" = ANY($1::text[])', [
    businesses.map((business) => business.id),
  ]);
}

export async function runConnectedIsolationVerification(environment = process.env) {
  const target = resolveIsolationDatabaseTarget(environment);
  const pool = new Pool({ connectionString: target.connectionString, max: 1 });
  const client = await pool.connect();
  const runId = `iso-${crypto.randomUUID()}`;
  const businessA = createBusinessFixture(runId, "a");
  const businessB = createBusinessFixture(runId, "b");
  const fixturesA = createDataFixtures(businessA.id, `${runId}-a`);
  const fixturesB = createDataFixtures(businessB.id, `${runId}-b`);
  const attackFixtures = createDataFixtures(
    businessB.id,
    `${runId}-attack`,
    "attack"
  );
  const createdBusinesses = [];

  try {
    await verifyDatabaseConfiguration(client);
    await seedTenant(client, businessA, fixturesA, createdBusinesses);
    await seedTenant(client, businessB, fixturesB, createdBusinesses);

    await verifyVisibility(client, businessA, fixturesA, fixturesB);
    await verifyVisibility(client, businessB, fixturesB, fixturesA);
    await verifyCrossBusinessMutations(
      client,
      businessA,
      fixturesB,
      attackFixtures
    );
    await verifyVisibility(client, businessB, fixturesB, fixturesA);

    const allFixtureIds = new Map(
      PROTECTED_TABLES.map((table) => [
        table,
        [
          fixturesA.find((fixture) => fixture.table === table).data.id,
          fixturesB.find((fixture) => fixture.table === table).data.id,
        ],
      ])
    );
    await verifyMissingContext(client, allFixtureIds);
    await verifyMissingContextWrite(
      client,
      attackFixtures.find((fixture) => fixture.table === "SalesEntry")
    );

    return {
      databaseName: target.databaseName,
      protectedTables: PROTECTED_TABLES.length,
      status: "passed",
    };
  } finally {
    if (createdBusinesses.length > 0) {
      await cleanup(client, createdBusinesses);
    }
    client.release();
    await pool.end();
  }
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  runConnectedIsolationVerification()
    .then((report) => {
      console.log(
        `Tenant isolation verification passed for ${report.protectedTables} tables in ${report.databaseName}.`
      );
    })
    .catch((error) => {
      console.error(`Tenant isolation verification failed: ${error.message}`);
      process.exitCode = 1;
    });
}
