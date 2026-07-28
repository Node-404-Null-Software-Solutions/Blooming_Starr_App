import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

test("Schedule exposes an edit interaction for existing shifts", () => {
  const client = read(
    "../src/app/(app)/app/[businessSlug]/schedule/ScheduleClient.tsx"
  );

  assert.match(client, /Pencil/);
  assert.match(client, /title="Edit shift"/);
  assert.match(client, /entry,\s*\}\)/);
  assert.match(client, /showForm\.entry \? "Edit Shift" : "Add Shift"/);
  assert.match(client, /entry=\{showForm\.entry\}/);
});

test("Shift form updates every editable field and retains create behavior", () => {
  const form = read(
    "../src/app/(app)/app/[businessSlug]/schedule/ShiftForm.tsx"
  );

  assert.match(form, /createScheduleEntry,/);
  assert.match(form, /updateScheduleEntry,/);
  assert.match(form, /entry\?: EditableShift/);
  assert.match(form, /await updateScheduleEntry\(entry\.id, businessSlug/);
  for (const field of [
    "employeeId",
    "date",
    "startTime",
    "endTime",
    "title",
    "notes",
  ]) {
    assert.match(form, new RegExp(`formData\\.get\\("${field}"\\)`));
  }
  assert.match(form, /await createScheduleEntry\(businessSlug, formData\)/);
  assert.match(form, /entry \? "Update Shift" : "Add Shift"/);
});

test("Schedule updates remain tenant-scoped and App Logic-aware", () => {
  const actions = read("../src/lib/actions/schedule.ts");
  const update = actions.slice(
    actions.indexOf("export async function updateScheduleEntry"),
    actions.indexOf("export async function deleteScheduleEntry")
  );

  assert.match(update, /schedule\.findById\(id\)/);
  assert.match(update, /employees\.findById\(data\.employeeId\)/);
  assert.match(update, /runDetailedAppLogicRowPipeline\(/);
  assert.match(update, /\{ sourceRowId: id \}/);
  assert.match(update, /schedule\.updateById\(id, updateData\)/);
});
