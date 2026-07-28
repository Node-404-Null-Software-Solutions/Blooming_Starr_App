import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

const modules = [
  {
    page: "../src/app/(app)/app/[businessSlug]/product-intake/page.tsx",
    filter:
      "../src/app/(app)/app/[businessSlug]/product-intake/ProductIntakeFilterPopover.tsx",
    fields: ["sku", "vendor", "source", "category", "notes"],
  },
  {
    page: "../src/app/(app)/app/[businessSlug]/overhead-expenses/page.tsx",
    filter:
      "../src/app/(app)/app/[businessSlug]/overhead-expenses/OverheadFilterPopover.tsx",
    fields: ["vendor", "brand", "category", "description", "notes"],
  },
  {
    page: "../src/app/(app)/app/[businessSlug]/treatment-tracking/page.tsx",
    filter:
      "../src/app/(app)/app/[businessSlug]/treatment-tracking/TreatmentFilterPopover.tsx",
    fields: ["sku", "target", "product", "activeIngredient", "method"],
  },
  {
    page: "../src/app/(app)/app/[businessSlug]/fertilizer-log/page.tsx",
    filter:
      "../src/app/(app)/app/[businessSlug]/fertilizer-log/FertilizerFilterPopover.tsx",
    fields: ["plantSku", "potSku", "product", "method", "notes"],
  },
];

test("top-bar search writes the shared q parameter", () => {
  const topBar = read("../src/components/app/TopBar.tsx");
  assert.match(topBar, /nextParams\.set\("q", trimmed\)/);
  assert.match(topBar, /nextParams\.delete\("q"\)/);
});

test("affected modules apply q as a case-insensitive multi-field search", () => {
  for (const config of modules) {
    const page = read(config.page);
    assert.match(page, /const qRaw = typeof sp\.q === "string"/);
    const searchStart = page.indexOf("...(qRaw");
    const searchEnd = page.indexOf(": {}),", searchStart);
    assert.notEqual(searchStart, -1);
    assert.notEqual(searchEnd, -1);
    const searchBlock = page.slice(searchStart, searchEnd);
    assert.match(searchBlock, /OR: \[/);
    assert.match(searchBlock, /contains: qRaw/);
    for (const field of config.fields) {
      assert.match(searchBlock, new RegExp(`\\b${field}:`));
    }
  }
});

test("module filters preserve top-bar q while applying and clearing filters", () => {
  for (const config of modules) {
    const filter = read(config.filter);
    assert.match(filter, /new URLSearchParams\(sp\.toString\(\)\)/);
    assert.doesNotMatch(filter, /delete\("q"\)/);
  }
});
