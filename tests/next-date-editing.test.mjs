import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

const actions = read("../src/lib/actions/data-entries.ts");
const treatmentClient = read(
  "../src/app/(app)/app/[businessSlug]/treatment-tracking/TreatmentTrackingClient.tsx"
);
const fertilizerClient = read(
  "../src/app/(app)/app/[businessSlug]/fertilizer-log/FertilizerLogClient.tsx"
);

function assertEditableNextDates(client, rowType) {
  assert.match(client, new RegExp(`keyof Omit<${rowType}, "id">`));
  assert.match(client, /payload\.nextEarliest = value \|\| null/);
  assert.match(client, /payload\.nextLatest = value \|\| null/);
  assert.match(
    client,
    /handleSave\(selectedRow\.id, "nextEarliest", v\)\} type="date"/
  );
  assert.match(
    client,
    /handleSave\(selectedRow\.id, "nextLatest", v\)\} type="date"/
  );
  assert.match(
    client,
    /handleSave\(row\.id, "nextEarliest", v\)\} type="date"/
  );
  assert.match(
    client,
    /handleSave\(row\.id, "nextLatest", v\)\} type="date"/
  );
}

test("Treatment Tracking supports validated next-date updates", () => {
  const treatmentActions = actions.slice(
    actions.indexOf("export type TreatmentTrackingUpdate"),
    actions.indexOf("export type OverheadExpenseUpdate")
  );
  assert.match(treatmentActions, /nextEarliest\?: string \| null/);
  assert.match(treatmentActions, /nextLatest\?: string \| null/);
  assert.match(treatmentActions, /runDateAppLogicSafely\(/);
  assertEditableNextDates(treatmentClient, "TreatmentRow");
});

test("Fertilizer Log supports validated next-date updates", () => {
  const fertilizerActions = actions.slice(
    actions.indexOf("export type FertilizerLogUpdate"),
    actions.indexOf("export async function deleteSalesEntry")
  );
  assert.match(fertilizerActions, /nextEarliest\?: string \| null/);
  assert.match(fertilizerActions, /nextLatest\?: string \| null/);
  assert.match(fertilizerActions, /runDateAppLogicSafely\(/);
  assertEditableNextDates(fertilizerClient, "FertilizerRow");
});
