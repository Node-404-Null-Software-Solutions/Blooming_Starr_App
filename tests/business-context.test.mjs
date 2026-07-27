import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/lib/business-context.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const contextModule = { exports: {} };
new Function("exports", "module", compiled)(
  contextModule.exports,
  contextModule
);
const { createBusinessContext } = contextModule.exports;

const validInput = {
  requestId: "request-1",
  userId: "user-1",
  membershipId: "membership-1",
  businessId: "business-1",
  businessSlug: "greenhouse-one",
  role: "OWNER",
};

test("creates an immutable context from server-derived tenant identity", () => {
  const context = createBusinessContext(validInput);

  assert.deepEqual(context, validInput);
  assert.equal(Object.isFrozen(context), true);
  assert.throws(() => {
    context.businessId = "business-2";
  }, TypeError);
  assert.equal(context.businessId, "business-1");
});

test("rejects a context with a blank tenant identity field", () => {
  assert.throws(
    () => createBusinessContext({ ...validInput, businessId: "   " }),
    /without a business ID/
  );
});

test("normalizes surrounding whitespace without changing identity values", () => {
  const context = createBusinessContext({
    ...validInput,
    businessSlug: "  greenhouse-one  ",
  });

  assert.equal(context.businessSlug, "greenhouse-one");
});
