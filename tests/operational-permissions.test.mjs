import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function read(relativeUrl) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

function loadTypeScriptModule(relativeUrl) {
  const compiled = ts.transpileModule(read(relativeUrl), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "module", compiled)(
    loadedModule.exports,
    loadedModule,
  );
  return loadedModule.exports;
}

const { OPERATION_MANAGER_ROLES, canManageOperations } = loadTypeScriptModule(
  "../src/lib/permissions.ts",
);

test("only Owners and Managers may manage operations", () => {
  assert.deepEqual([...OPERATION_MANAGER_ROLES], ["OWNER", "MANAGER"]);
  assert.equal(canManageOperations("OWNER"), true);
  assert.equal(canManageOperations("MANAGER"), true);
  assert.equal(canManageOperations("EMPLOYEE"), false);
});

test("every operational, employee, and schedule mutation requires a manager", () => {
  const actionFiles = [
    "../src/lib/actions/data-entries.ts",
    "../src/lib/actions/employees.ts",
    "../src/lib/actions/schedule.ts",
  ];

  for (const path of actionFiles) {
    const source = read(path);
    const exportedMutations =
      source.match(/^export async function /gm)?.length ?? 0;
    const managerGuards =
      source.match(/requireBusinessOperationManager\(businessSlug\)/g)
        ?.length ?? 0;

    assert.ok(exportedMutations > 0, `${path} has no exported mutations`);
    assert.equal(managerGuards, exportedMutations, path);
    assert.doesNotMatch(source, /requireBusinessMembership\(businessSlug\)/);
  }
});

test("direct new-record routes require operational manager access", () => {
  const pages = [
    "../src/app/(app)/app/[businessSlug]/plant-intake/new/page.tsx",
    "../src/app/(app)/app/[businessSlug]/product-intake/new/page.tsx",
    "../src/app/(app)/app/[businessSlug]/sales/new/page.tsx",
    "../src/app/(app)/app/[businessSlug]/overhead-expenses/new/page.tsx",
    "../src/app/(app)/app/[businessSlug]/transplant-log/new/page.tsx",
    "../src/app/(app)/app/[businessSlug]/treatment-tracking/new/page.tsx",
    "../src/app/(app)/app/[businessSlug]/fertilizer-log/new/page.tsx",
    "../src/app/(app)/app/[businessSlug]/employees/new/page.tsx",
  ];

  for (const path of pages) {
    assert.match(read(path), /requireBusinessOperationManager\(businessSlug\)/);
  }
});

test("shared and custom mutation controls fail closed for Employees", () => {
  const layout = read(
    "../src/app/(app)/app/[businessSlug]/layout.tsx",
  );
  const sharedControls = [
    "../src/app/(app)/app/[businessSlug]/_components/ModuleHeader.tsx",
    "../src/components/data-table/EditableCell.tsx",
    "../src/components/data-table/RowDetailDrawer.tsx",
    "../src/components/data-table/BulkSelectionBar.tsx",
    "../src/components/record-photo/RecordPhotoManager.tsx",
  ];
  const customControls = [
    "../src/app/(app)/app/[businessSlug]/plant-intake/PlantIntakeToolbar.tsx",
    "../src/app/(app)/app/[businessSlug]/employees/EmployeesClient.tsx",
    "../src/app/(app)/app/[businessSlug]/schedule/ScheduleClient.tsx",
  ];

  assert.match(layout, /BusinessPermissionsProvider role=\{membership\.role\}/);
  for (const path of [...sharedControls, ...customControls]) {
    assert.match(read(path), /canManageOperations/, path);
  }
});
