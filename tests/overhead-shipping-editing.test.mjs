import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

test("Overhead update recalculates derived amounts when Shipping changes", () => {
  const actions = read("../src/lib/actions/data-entries.ts");
  const update = actions.slice(
    actions.indexOf("export type OverheadExpenseUpdate"),
    actions.indexOf("export type FertilizerLogUpdate")
  );

  assert.match(update, /shippingCents\?: number/);
  assert.match(
    update,
    /const shippingCents = data\.shippingCents \?\? existing\.shippingCents/
  );
  assert.match(
    update,
    /\{ subTotalCents, shippingCents, discountCents, qty \}/
  );
  assert.match(
    update,
    /data\.shippingCents !== undefined && \{ shippingCents: data\.shippingCents \}/
  );
});

test("Overhead list and detail expose Shipping as a currency editor", () => {
  const page = read(
    "../src/app/(app)/app/[businessSlug]/overhead-expenses/page.tsx"
  );
  assert.match(page, /shippingCents: row\.shippingCents/);

  const client = read(
    "../src/app/(app)/app/[businessSlug]/overhead-expenses/OverheadExpensesClient.tsx"
  );
  assert.match(client, /shippingCents: number \| null/);
  assert.match(client, /payload\.shippingCents = numVal/);
  assert.match(client, /label: "Shipping"/);
  assert.match(client, /<th className=\{headCell\}>Shipping<\/th>/);
  assert.match(
    client,
    /handleSave\(row\.id, "shippingCents", v\)/
  );
  assert.match(client, /type="currency"/);
});
