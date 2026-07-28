import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

test("Employee compensation editors use the shared stored-cents contract", () => {
  const client = read(
    "../src/app/(app)/app/[businessSlug]/employees/EmployeesClient.tsx"
  );

  assert.match(client, /value=\{String\(row\.hourlyRateCents\)\}/);
  assert.match(client, /value=\{String\(row\.salaryRateCents\)\}/);
  assert.doesNotMatch(client, /hourlyRateCents \/ 100/);
  assert.doesNotMatch(client, /salaryRateCents \/ 100/);
  assert.doesNotMatch(client, /parseFloat\(value\) \* 100/);
  assert.match(client, /const cents = Number\(value\)/);
  assert.match(
    client,
    /Number\.isSafeInteger\(cents\) && cents >= 0/
  );
  assert.equal(client.match(/type="currency"/g)?.length, 2);
});

test("Employee compensation updates reject invalid stored-cent values", () => {
  const actions = read("../src/lib/actions/employees.ts");

  assert.match(
    actions,
    /function isValidCompensationCents\(value: number\)/
  );
  assert.match(
    actions,
    /Number\.isSafeInteger\(value\) && value >= 0/
  );
  assert.match(
    actions,
    /!isValidCompensationCents\(data\.hourlyRateCents\)/
  );
  assert.match(
    actions,
    /!isValidCompensationCents\(data\.salaryRateCents\)/
  );
});
