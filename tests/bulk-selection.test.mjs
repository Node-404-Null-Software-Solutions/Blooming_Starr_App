import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

test("record selection exposes a confirmed bulk delete action", () => {
  const bar = read("../src/components/data-table/BulkSelectionBar.tsx");
  assert.match(bar, /Delete selected/);
  assert.match(bar, /disabled=\{count === 0 \|\| isDeleting\}/);

  const recordClients = [
    "../src/app/(app)/app/[businessSlug]/plant-intake/PlantIntakeTable.tsx",
    "../src/app/(app)/app/[businessSlug]/product-intake/ProductIntakeClient.tsx",
    "../src/app/(app)/app/[businessSlug]/sales/SalesDataTable.tsx",
    "../src/app/(app)/app/[businessSlug]/transplant-log/TransplantLogClient.tsx",
  ];
  for (const client of recordClients) {
    const source = read(client);
    assert.match(source, /BulkSelectionBar/);
    assert.match(source, /window\.confirm/);
    assert.match(source, /deleteSelectedRows/);
  }
});

test("calculated inventory views do not expose misleading selection mode", () => {
  for (const client of [
    "../src/app/(app)/app/[businessSlug]/plant-inventory/PlantInventoryClient.tsx",
    "../src/app/(app)/app/[businessSlug]/product-inventory/ProductInventoryClient.tsx",
  ]) {
    assert.doesNotMatch(read(client), /onSelectClick=/);
  }
});

test("bulk server actions bound and normalize selected IDs", () => {
  const actions = read("../src/lib/actions/data-entries.ts");
  assert.match(actions, /const MAX_BULK_SELECTION = 500/);
  assert.match(actions, /new Set\(ids\.map/);
  for (const action of [
    "deletePlantIntakes",
    "deleteProductIntakes",
    "deleteSalesEntries",
    "deleteTransplantLogs",
  ]) {
    assert.match(actions, new RegExp(`export async function ${action}`));
  }
});
