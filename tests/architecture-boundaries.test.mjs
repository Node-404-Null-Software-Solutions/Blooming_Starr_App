import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const srcRoot = path.join(projectRoot, "src");

const dataPlaneModels = Object.freeze({
  appLogicExecutionLog: "src/lib/repositories/app-logic-execution-log.ts",
  appLogicRule: "src/lib/repositories/app-logic-rule.ts",
  employee: "src/lib/repositories/employee.ts",
  fertilizerLog: "src/lib/repositories/fertilizer-log.ts",
  lookupEntry: "src/lib/repositories/lookup-entry.ts",
  overheadExpense: "src/lib/repositories/overhead-expense.ts",
  plantIntake: "src/lib/repositories/plant-intake.ts",
  plantSkuReference: "src/lib/repositories/plant-sku-reference.ts",
  pricingEntry: "src/lib/repositories/pricing-entry.ts",
  product: "src/lib/repositories/product.ts",
  productIntake: "src/lib/repositories/product-intake.ts",
  salesEntry: "src/lib/repositories/sales.ts",
  scheduleEntry: "src/lib/repositories/schedule-entry.ts",
  transplantLog: "src/lib/repositories/transplant-log.ts",
  treatmentTracking: "src/lib/repositories/treatment-tracking.ts",
});

const controlPlaneModels = Object.freeze([
  "BusinessLogo",
  "JoinRequest",
  "Membership",
  "PendingCoOwnerInvite",
  "PendingMemberInvite",
]);

const rawTransactionAllowlist = new Set([
  "src/app/(public)/accept-co-owner/page.tsx",
  "src/app/(public)/join/page.tsx",
  "src/app/api/upload-logo/route.ts",
  "src/lib/actions/onboarding.ts",
  "src/lib/actions/settings.ts",
  "src/lib/tenant-rls.ts",
]);

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll("\\", "/");
}

function parseSource(filePath) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function accessedDelegate(node) {
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    ["client", "db", "tx"].includes(node.expression.text)
  ) {
    return node.name.text;
  }
  if (
    ts.isElementAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    ["client", "db", "tx"].includes(node.expression.text) &&
    node.argumentExpression &&
    ts.isStringLiteral(node.argumentExpression)
  ) {
    return node.argumentExpression.text;
  }
  return null;
}

function hasUseDirective(sourceFile, directive) {
  const first = sourceFile.statements[0];
  return Boolean(
    first &&
      ts.isExpressionStatement(first) &&
      ts.isStringLiteral(first.expression) &&
      first.expression.text === directive
  );
}

function hasRuntimeImport(importDeclaration) {
  const clause = importDeclaration.importClause;
  if (!clause) return true;
  if (clause.isTypeOnly) return false;
  if (clause.name) return true;
  if (!clause.namedBindings) return false;
  if (ts.isNamespaceImport(clause.namedBindings)) return true;
  return clause.namedBindings.elements.some((element) => !element.isTypeOnly);
}

function isRestrictedServerModule(moduleName) {
  return (
    moduleName === "@/lib/authz" ||
    moduleName === "@/lib/db" ||
    moduleName === "@/lib/app-logic-engine" ||
    moduleName === "@/lib/dashboard" ||
    moduleName === "@/lib/plant-sku-service" ||
    moduleName === "@/lib/tenant-rls" ||
    moduleName.startsWith("@/lib/repositories/")
  );
}

test("every business-owned Prisma model is classified by architectural layer", () => {
  const schema = readFileSync(path.join(projectRoot, "prisma/schema.prisma"), "utf8");
  const businessOwnedModels = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)]
    .filter(([, , body]) => /^\s*businessId\s+/m.test(body))
    .map(([, modelName]) => modelName)
    .sort();
  const dataModelNames = Object.keys(dataPlaneModels).map(
    (delegate) => delegate[0].toUpperCase() + delegate.slice(1)
  );
  const classifiedModels = [...dataModelNames, ...controlPlaneModels].sort();

  assert.deepEqual(businessOwnedModels, classifiedModels);
});

test("data-plane Prisma delegates are accessed only by their repositories", () => {
  const violations = [];

  for (const filePath of listSourceFiles(srcRoot)) {
    const sourceFile = parseSource(filePath);
    const sourceRelativePath = relativePath(filePath);
    walk(sourceFile, (node) => {
      const delegate = accessedDelegate(node);
      const expectedRepository = delegate ? dataPlaneModels[delegate] : null;
      if (expectedRepository && sourceRelativePath !== expectedRepository) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        violations.push(
          `${sourceRelativePath}:${line + 1} accesses ${delegate}; use ${expectedRepository}`
        );
      }
    });
  }

  assert.deepEqual(violations, []);
});

test("every data-plane repository requires BusinessContext", () => {
  const violations = [];

  for (const [delegate, repositoryPath] of Object.entries(dataPlaneModels)) {
    const absolutePath = path.join(projectRoot, repositoryPath);
    if (!existsSync(absolutePath)) {
      violations.push(`${delegate} is missing ${repositoryPath}`);
      continue;
    }
    const source = readFileSync(absolutePath, "utf8");
    if (!/context:\s*BusinessContext/.test(source)) {
      violations.push(`${repositoryPath} does not require BusinessContext`);
    }
    if (!/createTenantScopedClient\(context\)/.test(source)) {
      violations.push(`${repositoryPath} does not default to the RLS client`);
    }
  }

  assert.deepEqual(violations, []);
});

test("the RLS runtime registers every data-plane delegate", () => {
  const source = readFileSync(path.join(srcRoot, "lib/tenant-rls.ts"), "utf8");
  const delegateBlock = source.match(
    /TENANT_DATA_DELEGATES\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\s*as const\)/
  );
  assert.ok(delegateBlock);

  const registeredDelegates = [
    ...delegateBlock[1].matchAll(/"([A-Za-z][A-Za-z0-9]*)"/g),
  ]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(registeredDelegates, Object.keys(dataPlaneModels).sort());
});

test("the migration and connected verifier cover every data-plane table", () => {
  const expectedTables = Object.keys(dataPlaneModels)
    .map((delegate) => delegate[0].toUpperCase() + delegate.slice(1))
    .sort();
  const migration = readdirSync(path.join(projectRoot, "prisma/migrations"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      readFileSync(
        path.join(
          projectRoot,
          "prisma/migrations",
          entry.name,
          "migration.sql"
        ),
        "utf8"
      )
    )
    .join("\n");
  const migrationTables = [
    ...migration.matchAll(
      /ALTER TABLE "([A-Za-z][A-Za-z0-9]*)" ENABLE ROW LEVEL SECURITY;/g
    ),
  ]
    .map((match) => match[1])
    .sort();
  const verifier = readFileSync(
    path.join(projectRoot, "scripts/verify-tenant-isolation.mjs"),
    "utf8"
  );
  const verifierBlock = verifier.match(
    /PROTECTED_TABLES\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/
  );
  assert.ok(verifierBlock);
  const verifierTables = [
    ...verifierBlock[1].matchAll(/"([A-Za-z][A-Za-z0-9]*)"/g),
  ]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(migrationTables, expectedTables);
  assert.deepEqual(verifierTables, expectedTables);
});

test("raw Prisma transactions remain confined to control-plane code", () => {
  const violations = [];

  for (const filePath of listSourceFiles(srcRoot)) {
    const sourceFile = parseSource(filePath);
    const sourceRelativePath = relativePath(filePath);
    walk(sourceFile, (node) => {
      if (!ts.isPropertyAccessExpression(node)) return;
      if (node.name.text !== "$transaction") return;
      if (rawTransactionAllowlist.has(sourceRelativePath)) return;
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      violations.push(
        `${sourceRelativePath}:${line + 1} uses an unclassified raw transaction`
      );
    });
  }

  assert.deepEqual(violations, []);
});

test("client modules cannot import server data layers at runtime", () => {
  const violations = [];

  for (const filePath of listSourceFiles(srcRoot)) {
    const sourceFile = parseSource(filePath);
    if (!hasUseDirective(sourceFile, "use client")) continue;

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const moduleName = statement.moduleSpecifier.text;
      if (isRestrictedServerModule(moduleName) && hasRuntimeImport(statement)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(statement.getStart());
        violations.push(`${relativePath(filePath)}:${line + 1} imports ${moduleName}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test("server action modules declare the server boundary", () => {
  const actionsRoot = path.join(srcRoot, "lib/actions");
  const violations = listSourceFiles(actionsRoot)
    .filter((filePath) => !hasUseDirective(parseSource(filePath), "use server"))
    .map(relativePath);

  assert.deepEqual(violations, []);
});

test("only authorization code may create a BusinessContext", () => {
  const violations = [];

  for (const filePath of listSourceFiles(srcRoot)) {
    const sourceFile = parseSource(filePath);
    const sourceRelativePath = relativePath(filePath);
    if (sourceRelativePath === "src/lib/business-context.ts") continue;

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      if (statement.moduleSpecifier.text !== "@/lib/business-context") continue;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      const importsFactory = bindings.elements.some(
        (element) => (element.propertyName ?? element.name).text === "createBusinessContext"
      );
      if (importsFactory && sourceRelativePath !== "src/lib/authz.ts") {
        violations.push(`${sourceRelativePath} imports createBusinessContext`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
