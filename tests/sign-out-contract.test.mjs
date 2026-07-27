import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sidebarSource = readFileSync(
  new URL("../src/components/app/AppSidebar.tsx", import.meta.url),
  "utf8"
);

test("the persistent application sidebar signs out through Clerk", () => {
  assert.match(
    sidebarSource,
    /import\s+\{\s*SignOutButton\s*\}\s+from\s+"@clerk\/nextjs"/
  );
  assert.match(
    sidebarSource,
    /<SignOutButton\s+redirectUrl="\/sign-in">/
  );
  assert.match(sidebarSource, />Sign out<\/span>/);
});
