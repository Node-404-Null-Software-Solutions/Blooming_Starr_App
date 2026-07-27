# App logic runtime

The app-logic runtime is a deterministic row calculator. It does not execute
JavaScript and has no access to the database, tenant identifiers, repositories,
the network, the filesystem, environment variables, clocks, or randomness.

The server resolves enabled rules through the current `BusinessContext` and its
tenant-scoped App Logic repository. Only the selected rule text and the current
module's numeric row fields enter the runtime. Rules execute in stored order,
and output from one rule becomes input to the next rule for that row.

## Executable selections

- Sales, Product Intake, and Overhead Expenses: Before Save, After Save,
  After Import, and Manual
- Transplant Log: Before Save
- Types: Formula and Script

Interactive writes run Before Save and then After Save. Workbook imports run
Before Save and then After Import. Manual rules run only when an owner selects a
tenant-scoped persisted row from the App Logic settings page.

## Formula syntax

Each non-comment line assigns an expression to an approved writable output:

```text
totalSaleCents = qty * salePriceCents
profitCents = totalSaleCents - costCents
marginPct = totalSaleCents > 0 ? (profitCents / totalSaleCents) * 100 : 0
```

## Script syntax

Scripts use three commands:

```text
REQUIRE qty > 0
SET totalSaleCents = qty * salePriceCents
SET profitCents = totalSaleCents - costCents
ACTION SYNC_PRODUCT_MASTER
```

`REQUIRE` must evaluate to a boolean. A false requirement stops the rule and
raises a `REQUIREMENT` runtime error. `SET` must produce a finite number and may
only target an output listed for the selected module.

`ACTION` emits a governed intent. It does not receive a database client or run
arbitrary code. `SYNC_PRODUCT_MASTER` is allowlisted for Sales and Product
Intake on After Save and Manual triggers. A tenant-bound server broker validates
the source row and performs the product upsert through the Product repository.

## Expressions

Expressions support numeric literals, approved row fields, parentheses,
ternaries, and these operators:

- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `<`, `<=`, `>`, `>=`, `==`, `===`, `!=`, `!==`
- Boolean: `!`, `&&`, `||`

Approved helpers are `abs`, `ceil`, `floor`, `max`, `min`, and `round`.
Logical operators and ternaries short-circuit. Division or modulo by zero,
non-finite results, wrong expression types, unknown fields, unknown helpers,
and invalid helper arity fail closed.

## Structural sandbox limits

- 100 statements per rule
- 512 tokens per expression
- 512 expression nodes per expression
- 32 nesting levels

Execution governance also limits one trigger to 25 active rules, 250 total
statements, and 10 governed action intents.

## Preview and execution history

Owners can run an unsaved rule against editable sample JSON. Preview uses the
same contract parser, compiler, and runtime as saved rules. It reports output,
changed fields, and action intents, but never calls the governed action broker.

Every production, import, manual, and preview execution records bounded audit
metadata: tenant-derived business ID, request and actor IDs, rule identity,
module, trigger, source row, status, duration, statement/action counts, and a
sanitized error. The settings page reads only the current business's recent
history through its tenant-scoped repository.

## Offline verification

Run `npm run test:app-logic` for the focused Phase 2 suite. It covers the typed
contract, deterministic runtime, lifecycle ordering, governed action broker,
limits, audits, preview, manual execution, and a two-business end-to-end harness
using the same rule, row-service, broker, and audit modules as production.

Run `npm test` for the complete offline regression suite. Neither command
connects to PostgreSQL. Connected RLS verification remains a separate,
explicitly configured disposable-database operation.
