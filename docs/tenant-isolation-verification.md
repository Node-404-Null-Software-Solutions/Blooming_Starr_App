# Tenant isolation verification

The repository has two isolation test levels. The offline suite is safe to run
without a database. The connected verifier is destructive only to fixtures it
creates, but it must still run exclusively against a disposable PostgreSQL test
database.

## Offline verification

Run:

```sh
npm run test:isolation
```

This verifies repository scoping, the RLS transaction runtime, two-business
service behavior, pooled-context reset behavior, migration coverage, and the
connected verifier's safety contract. It does not claim that PostgreSQL has
executed the migration.

The focused `npm run test:app-logic` suite additionally runs an in-memory
two-business workflow through the production app-logic engine, manual row
service, governed Product action broker, and execution-audit adapter. Matching
SKUs, row IDs from another business, product writes, and audit records are all
checked for business separation without opening a database connection.

## Connected PostgreSQL verification

The target database must:

- be disposable and have `test`, `testing`, `ci`, or `sandbox` in its name;
- have all Prisma migrations applied;
- use a verification account that can create and delete test `Business` rows;
- grant that account membership in `blooming_starr_tenant` through the RLS
  migration.

Set these environment variables in the connected CI/test environment:

```text
ISOLATION_TEST_DATABASE_URL=postgresql://.../blooming_starr_ci_test
CONFIRM_ISOLATION_TEST_DATABASE=blooming_starr_ci_test
```

Do not set `ISOLATION_TEST_DATABASE_URL` to the same target as `DATABASE_URL`.
The verifier rejects that configuration.

After applying migrations, run:

```sh
npm run test:isolation:db
```

The verifier checks the tenant role, role membership, table privileges, forced
RLS state, and policies. It then creates two temporary businesses with matching
spreadsheet keys and verifies all 15 protected tables for:

- tenant-only reads;
- rejected cross-business inserts;
- zero-row cross-business updates and deletes;
- no-context fail-closed behavior;
- context reset while reusing one pooled PostgreSQL connection.

The temporary rows and businesses are deleted before the connection closes.
The command returns a non-zero exit code on the first failed guarantee.
