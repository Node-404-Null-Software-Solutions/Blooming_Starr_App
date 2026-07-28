import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

test("the shared save form keeps values and renders returned errors inline", () => {
  const form = read("../src/components/forms/InlineSaveForm.tsx");

  assert.match(form, /event\.preventDefault\(\)/);
  assert.match(form, /new FormData\(event\.currentTarget\)/);
  assert.match(form, /const result = await action\(formData\)/);
  assert.match(form, /setError\(result\.error \?\?/);
  assert.match(form, /role="alert"/);
  assert.match(form, /aria-live="assertive"/);
  assert.match(form, /router\.push\(successHref\)/);
  assert.doesNotMatch(form, /\.reset\(\)/);
});

test("affected create pages return server and App Logic failures to their forms", () => {
  const createPages = [
    [
      "../src/app/(app)/app/[businessSlug]/plant-intake/new/page.tsx",
      "createPlantIntake",
    ],
    [
      "../src/app/(app)/app/[businessSlug]/product-intake/new/page.tsx",
      "createProductIntake",
    ],
    [
      "../src/app/(app)/app/[businessSlug]/sales/new/page.tsx",
      "createSalesEntry",
    ],
    [
      "../src/app/(app)/app/[businessSlug]/overhead-expenses/new/page.tsx",
      "createOverheadExpense",
    ],
    [
      "../src/app/(app)/app/[businessSlug]/transplant-log/new/page.tsx",
      "createTransplantLog",
    ],
    [
      "../src/app/(app)/app/[businessSlug]/treatment-tracking/new/page.tsx",
      "createTreatmentTracking",
    ],
    [
      "../src/app/(app)/app/[businessSlug]/fertilizer-log/new/page.tsx",
      "createFertilizerLog",
    ],
  ];

  for (const [path, action] of createPages) {
    const page = read(path);
    assert.match(page, new RegExp(`return ${action}\\(businessSlug, formData\\)`));
    assert.doesNotMatch(page, /if \(res\.ok\) redirect/);
    assert.doesNotMatch(page, /Promise<void>/);
  }
});

test("every affected new-record form uses the inline save flow", () => {
  const directForms = [
    "../src/app/(app)/app/[businessSlug]/plant-intake/new/PlantIntakeForm.tsx",
    "../src/app/(app)/app/[businessSlug]/product-intake/new/ProductIntakeForm.tsx",
    "../src/app/(app)/app/[businessSlug]/sales/new/page.tsx",
    "../src/app/(app)/app/[businessSlug]/fertilizer-log/new/FertilizerLogForm.tsx",
  ];
  const sharedShellForms = [
    "../src/app/(app)/app/[businessSlug]/overhead-expenses/new/page.tsx",
    "../src/app/(app)/app/[businessSlug]/transplant-log/new/TransplantLogForm.tsx",
    "../src/app/(app)/app/[businessSlug]/treatment-tracking/new/page.tsx",
  ];

  for (const path of directForms) {
    const form = read(path);
    assert.match(form, /<InlineSaveForm/);
    assert.match(form, /successHref=/);
  }

  for (const path of sharedShellForms) {
    const form = read(path);
    assert.match(form, /<PlantStyleAddFormShell/);
    assert.match(form, /successHref=/);
  }
});
