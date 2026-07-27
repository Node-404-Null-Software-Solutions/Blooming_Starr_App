import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadAudit(createRepository) {
  const source = readFileSync(
    new URL("../src/lib/app-logic-audit.ts", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "module", "require", compiled)(
    loadedModule.exports,
    loadedModule,
    (moduleName) => {
      if (moduleName === "@/lib/repositories/app-logic-execution-log") {
        return { createAppLogicExecutionLogRepository: createRepository };
      }
      if (moduleName === "@/lib/app-logic-engine") {
        return { AppLogicExecutionFailure: class extends Error {} };
      }
      throw new Error(`Unexpected audit test import: ${moduleName}`);
    }
  );
  return loadedModule.exports;
}

test("audit persistence derives tenant, request, and actor from BusinessContext", async () => {
  const calls = [];
  const context = {
    businessId: "business-a",
    requestId: "request-a",
    userId: "user-a",
  };
  const audit = loadAudit((receivedContext) => {
    calls.push({ operation: "repository", receivedContext });
    return {
      createMany: async (data) => calls.push({ operation: "createMany", data }),
    };
  });

  await audit.persistAppLogicExecutionAudit(
    context,
    [
      {
        ruleId: "rule-a",
        ruleName: "Sales total",
        module: "sales",
        trigger: "beforeSave",
        mode: "FORMULA",
        status: "FAILED",
        durationMs: 3,
        statementCount: 2,
        actionCount: 0,
        errorCode: "ARITHMETIC",
        errorMessage: `Division   by zero ${"x".repeat(600)}`,
      },
    ],
    "INTERACTIVE",
    "row-a"
  );

  assert.equal(calls[0].receivedContext, context);
  assert.deepEqual(calls[1].data[0], {
    ruleId: "rule-a",
    ruleName: "Sales total",
    module: "sales",
    trigger: "beforeSave",
    mode: "FORMULA",
    source: "INTERACTIVE",
    sourceRowId: "row-a",
    requestId: "request-a",
    actorUserId: "user-a",
    status: "FAILED",
    durationMs: 3,
    statementCount: 2,
    actionCount: 0,
    errorCode: "ARITHMETIC",
    errorMessage: calls[1].data[0].errorMessage,
  });
  assert.ok(calls[1].data[0].errorMessage.length <= 500);
  assert.doesNotMatch(calls[1].data[0].errorMessage, /\s{2,}/);
});
