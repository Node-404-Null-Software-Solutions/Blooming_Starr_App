import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/app/TopBar.tsx", import.meta.url),
  "utf8"
);

test("top-bar refresh performs a full browser reload", () => {
  assert.match(
    source,
    /function handleRefresh\(\)\s*\{\s*window\.location\.reload\(\);\s*\}/
  );
  assert.match(source, /onClick=\{handleRefresh\}/);
  assert.match(source, /aria-label="Reload page"/);
});
