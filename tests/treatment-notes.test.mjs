import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

test("Treatment Tracking schema and migration persist notes", () => {
  const schema = read("../prisma/schema.prisma");
  const model = schema.slice(
    schema.indexOf("model TreatmentTracking"),
    schema.indexOf("model OverheadExpense")
  );
  assert.match(model, /notes\s+String\?/);

  const migration = read(
    "../prisma/migrations/20260727000003_add_treatment_notes/migration.sql"
  );
  assert.match(migration, /ADD COLUMN "notes" TEXT/);
});

test("Treatment Tracking create, update, and import paths carry notes", () => {
  const actions = read("../src/lib/actions/data-entries.ts");
  assert.match(actions, /notes\?: string \| null/);
  assert.match(actions, /notes: formStr\(formData, "notes"\) \|\| null/);
  assert.match(
    actions,
    /\.\.\.\(data\.notes !== undefined && \{ notes: data\.notes \}\)/
  );

  const importer = read("../src/lib/actions/import.ts");
  assert.match(importer, /const cNotes = col\("Notes"\)/);
  assert.match(importer, /notes: cNotes/);
});

test("Treatment Tracking list and detail render editable stored notes", () => {
  const page = read(
    "../src/app/(app)/app/[businessSlug]/treatment-tracking/page.tsx"
  );
  assert.match(page, /notes: \{ contains: qRaw/);
  assert.match(page, /notes: row\.notes/);

  const client = read(
    "../src/app/(app)/app/[businessSlug]/treatment-tracking/TreatmentTrackingClient.tsx"
  );
  assert.match(client, /notes: string \| null/);
  assert.match(client, /payload\.notes = value \|\| null/);
  assert.match(client, /label: "Notes"/);
  assert.match(client, /handleSave\(row\.id, "notes", v\)/);
});
