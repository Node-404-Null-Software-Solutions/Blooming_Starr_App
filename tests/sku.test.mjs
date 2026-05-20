import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/sku.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const skuModule = { exports: {} };
new Function("exports", "module", compiled)(skuModule.exports, skuModule);
const sku = skuModule.exports;

test("normalizeName trims, collapses spaces, and uppercases", () => {
  assert.equal(sku.normalizeName("  Monstera   deliciosa "), "MONSTERA DELICIOSA");
});

test("cleanLetters removes non-letters", () => {
  assert.equal(sku.cleanLetters("A-1 b.c!"), "ABC");
});

test("normalizeSuffix trims and uppercases while preserving punctuation", () => {
  assert.equal(sku.normalizeSuffix("  ab-01.2  "), "AB-01.2");
});

test("single-word input generates a two-letter base code", () => {
  assert.equal(sku.generateBaseCode("Calathea"), "CA");
});

test("single-word collision falls back from CA to CAL", () => {
  assert.equal(sku.resolveUniqueCodeCandidate("Calathea", ["CA"]), "CAL");
});

test("multi-word input ignores stop words and uses remaining initials", () => {
  assert.equal(sku.generateBaseCode("Bird of Paradise"), "BP");
});

test("hyphenated input treats hyphens as spaces", () => {
  assert.equal(sku.generateBaseCode("Thai-Constellation"), "TC");
});

test("multi-word collision uses the fallback rule", () => {
  assert.equal(sku.resolveUniqueCodeCandidate("Monstera Deliciosa", ["MD"]), "MDE");
});

test("final fallback uses first four clean letters", () => {
  assert.equal(sku.resolveUniqueCodeCandidate("Monstera Deliciosa", ["MD", "MDE"]), "MONS");
});

test("numeric suffix strategy produces a unique code", () => {
  assert.equal(
    sku.resolveUniqueCodeCandidate("Monstera Deliciosa", ["MD", "MDE", "MONS", "MONS-2"]),
    "MONS-3"
  );
});

test("empty plantName can be detected before final SKU construction", () => {
  assert.equal(sku.normalizeName(null), "");
});

test("empty optional fields are omitted", () => {
  assert.equal(sku.buildFinalSku({ plant: "MOD", category: "", variety: null, suffix: "" }), "MOD");
});
