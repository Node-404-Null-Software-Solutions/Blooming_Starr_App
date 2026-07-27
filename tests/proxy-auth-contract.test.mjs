import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxySource = readFileSync(
  new URL("../src/proxy.ts", import.meta.url),
  "utf8"
);

test("health endpoint remains public while application routes stay protected", () => {
  const publicRoutes = proxySource.match(
    /createRouteMatcher\(\[([\s\S]*?)\]\)/
  );

  assert.ok(publicRoutes);
  assert.match(publicRoutes[1], /"\/api\/health\(\.\*\)"/);
  assert.doesNotMatch(publicRoutes[1], /"\/app(?:\/|\()/);
  assert.match(proxySource, /await auth\.protect\(\)/);
});
