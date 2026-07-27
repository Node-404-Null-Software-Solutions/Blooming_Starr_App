import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/lib/repositories/tenant-scope.ts", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const scopeModule = { exports: {} };
new Function("exports", "module", compiled)(scopeModule.exports, scopeModule);
const { withBusinessData, withBusinessScope } = scopeModule.exports;

test("scopes an unfiltered query to the authenticated business", () => {
  assert.deepEqual(withBusinessScope("business-a"), {
    businessId: "business-a",
  });
});

test("combines caller filters with the authenticated business", () => {
  assert.deepEqual(withBusinessScope("business-a", { sku: "PLANT-1" }), {
    AND: [{ businessId: "business-a" }, { sku: "PLANT-1" }],
  });
});

test("a conflicting caller filter cannot replace the authenticated business", () => {
  assert.deepEqual(
    withBusinessScope("business-a", { businessId: "business-b" }),
    {
      AND: [{ businessId: "business-a" }, { businessId: "business-b" }],
    }
  );
});

test("write data always receives the authenticated business last", () => {
  assert.deepEqual(
    withBusinessData("business-a", {
      businessId: "business-b",
      sku: "PLANT-1",
    }),
    { businessId: "business-a", sku: "PLANT-1" }
  );
});
