"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessRole } from "@/lib/authz";
import { ensureDefaultAppLogicRules } from "@/lib/app-logic-engine";
import {
  getAppLogicSelectionMessage,
  isAppLogicMode,
  isAppLogicModule,
  isAppLogicTrigger,
  isExecutableAppLogicModule,
  isExecutableAppLogicSelection,
  validateAppLogicRuleContract,
} from "@/lib/app-logic-contract";
import type {
  AppLogicExecutionLogRow,
  AppLogicRuleRow,
  ManualAppLogicRowOption,
} from "@/lib/app-logic-options";
import {
  previewAppLogicProgram,
  type AppLogicPreviewResult,
} from "@/lib/app-logic-preview";
import { validateAppLogicProgram } from "@/lib/app-logic-runtime";
import { runManualAppLogicForRow } from "@/lib/app-logic-row-service";
import { persistAppLogicExecutionAudit } from "@/lib/app-logic-audit";
import { createAppLogicRuleRepository } from "@/lib/repositories/app-logic-rule";
import { createAppLogicExecutionLogRepository } from "@/lib/repositories/app-logic-execution-log";
import { createOverheadExpenseRepository } from "@/lib/repositories/overhead-expense";
import { createProductIntakeRepository } from "@/lib/repositories/product-intake";
import { createSalesRepository } from "@/lib/repositories/sales";

function readRuleForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const targetModule = String(formData.get("module") ?? "").trim();
  const trigger = String(formData.get("trigger") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const expression = String(formData.get("expression") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const enabled = formData.get("enabled") === "on";

  if (!name) return { ok: false as const, error: "Name is required." };
  if (name.length > 80) return { ok: false as const, error: "Name is too long." };
  if (!isAppLogicModule(targetModule)) return { ok: false as const, error: "Choose a module." };
  if (!isAppLogicTrigger(trigger)) return { ok: false as const, error: "Choose a trigger." };
  if (!isAppLogicMode(mode)) return { ok: false as const, error: "Choose a rule type." };
  if (!expression) return { ok: false as const, error: "Formula or script is required." };
  if (expression.length > 5000) {
    return { ok: false as const, error: "Formula or script is too long." };
  }
  const validation = validateAppLogicRuleContract({
    module: targetModule,
    trigger,
    mode,
    expression,
    enabled,
  });
  if (!validation.ok) {
    return { ok: false as const, error: validation.error };
  }
  if (validation.program) {
    const programValidation = validateAppLogicProgram(validation.program);
    if (!programValidation.ok) {
      return { ok: false as const, error: programValidation.error };
    }
  }

  return {
    ok: true as const,
    data: {
      name,
      module: targetModule,
      trigger,
      mode,
      expression,
      notes: notes || null,
      enabled,
    },
  };
}

export async function listAppLogicRules(businessSlug: string): Promise<AppLogicRuleRow[]> {
  const { businessContext } = await requireBusinessRole(businessSlug, ["OWNER"]);
  const rules = createAppLogicRuleRepository(businessContext);
  await ensureDefaultAppLogicRules(businessContext);

  const storedRules = await rules.listForManagement();
  return storedRules.map((rule) => {
    if (
      !isAppLogicModule(rule.module) ||
      !isAppLogicTrigger(rule.trigger) ||
      !isAppLogicMode(rule.mode)
    ) {
      throw new Error(`App logic rule ${rule.id} has an invalid stored contract.`);
    }
    return {
      ...rule,
      module: rule.module,
      trigger: rule.trigger,
      mode: rule.mode,
    };
  });
}

export async function listAppLogicExecutionLogs(
  businessSlug: string,
  limit = 50
): Promise<AppLogicExecutionLogRow[]> {
  const { businessContext } = await requireBusinessRole(businessSlug, ["OWNER"]);
  return createAppLogicExecutionLogRepository(businessContext).listRecent(limit);
}

export async function previewAppLogicRule(
  businessSlug: string,
  request: {
    module: string;
    trigger: string;
    mode: string;
    expression: string;
    input: Record<string, unknown>;
  }
): Promise<AppLogicPreviewResult> {
  const { businessContext } = await requireBusinessRole(businessSlug, ["OWNER"]);
  if (
    !isAppLogicModule(request.module) ||
    !isExecutableAppLogicModule(request.module) ||
    !isAppLogicTrigger(request.trigger) ||
    !isAppLogicMode(request.mode)
  ) {
    return {
      ok: false,
      error: "Choose a connected module, trigger, and rule type.",
      errorCode: "INPUT",
      statementCount: 0,
      actionCount: 0,
    };
  }

  const startedAt = Date.now();
  const result = previewAppLogicProgram({
    module: request.module,
    trigger: request.trigger,
    mode: request.mode,
    expression: request.expression,
    input: request.input,
  });
  await persistAppLogicExecutionAudit(
    businessContext,
    [
      {
        ruleId: "preview",
        ruleName: "Unsaved rule preview",
        module: request.module,
        trigger: request.trigger,
        mode: request.mode,
        status: result.ok ? "SUCCEEDED" : "FAILED",
        durationMs: Math.max(0, Date.now() - startedAt),
        statementCount: result.statementCount,
        actionCount: result.actionCount,
        errorCode: result.ok ? undefined : result.errorCode,
        errorMessage: result.ok ? undefined : result.error,
      },
    ],
    "PREVIEW"
  );
  return result;
}

function shortDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "No date";
}

export async function listManualAppLogicRows(
  businessSlug: string,
  moduleValue: string,
  limit = 50
): Promise<{ ok: boolean; error?: string; rows: ManualAppLogicRowOption[] }> {
  const { businessContext } = await requireBusinessRole(businessSlug, ["OWNER"]);
  if (
    !isAppLogicModule(moduleValue) ||
    !isExecutableAppLogicModule(moduleValue) ||
    !isExecutableAppLogicSelection(moduleValue, "manual", "SCRIPT")
  ) {
    return {
      ok: false,
      error:
        getAppLogicSelectionMessage(moduleValue, "manual", "SCRIPT") ??
        "Manual rules are not connected for this module.",
      rows: [],
    };
  }

  if (moduleValue === "sales") {
    const rows = await createSalesRepository(businessContext).listForManualRun(limit);
    return {
      ok: true,
      rows: rows.map((row) => ({
        id: row.id,
        label: `${shortDate(row.date)} · ${row.sku} · ${row.itemName}`,
      })),
    };
  }
  if (moduleValue === "productIntake") {
    const rows = await createProductIntakeRepository(
      businessContext
    ).listForManualRun(limit);
    return {
      ok: true,
      rows: rows.map((row) => ({
        id: row.id,
        label: `${shortDate(row.date)} · ${row.sku} · ${row.category}`,
      })),
    };
  }

  const rows = await createOverheadExpenseRepository(
    businessContext
  ).listForManualRun(limit);
  return {
    ok: true,
    rows: rows.map((row) => ({
      id: row.id,
      label: `${shortDate(row.date)} · ${row.vendor} · ${row.description}`,
    })),
  };
}

export async function createAppLogicRule(
  businessSlug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const { businessContext } = await requireBusinessRole(businessSlug, ["OWNER"]);
  const rules = createAppLogicRuleRepository(businessContext);
  const parsed = readRuleForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const count = await rules.countAll();

  await rules.create({
    ...parsed.data,
    sortOrder: count,
  });

  revalidatePath(`/app/${businessSlug}/settings/app-logic`);
  return { ok: true };
}

export async function updateAppLogicRule(
  id: string,
  businessSlug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const { businessContext } = await requireBusinessRole(businessSlug, ["OWNER"]);
  const rules = createAppLogicRuleRepository(businessContext);
  const parsed = readRuleForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const updated = await rules.updateById(id, parsed.data);
  if (!updated) return { ok: false, error: "Rule not found." };

  revalidatePath(`/app/${businessSlug}/settings/app-logic`);
  return { ok: true };
}

export async function deleteAppLogicRule(
  id: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { businessContext } = await requireBusinessRole(businessSlug, ["OWNER"]);
  const rules = createAppLogicRuleRepository(businessContext);
  const deleted = await rules.deleteById(id);
  if (!deleted) return { ok: false, error: "Rule not found." };

  revalidatePath(`/app/${businessSlug}/settings/app-logic`);
  return { ok: true };
}

export async function runManualAppLogic(
  businessSlug: string,
  moduleValue: string,
  rowId: string
): Promise<{ ok: boolean; error?: string; scope?: Record<string, number> }> {
  const { businessContext } = await requireBusinessRole(businessSlug, ["OWNER"]);
  const normalizedRowId = rowId.trim();
  if (!isAppLogicModule(moduleValue) || !isExecutableAppLogicModule(moduleValue)) {
    return { ok: false, error: "Choose a connected module." };
  }
  if (!normalizedRowId) return { ok: false, error: "Row ID is required." };

  try {
    const result = await runManualAppLogicForRow(
      businessContext,
      moduleValue,
      normalizedRowId
    );
    if (!result.found) return { ok: false, error: "Row not found." };

    revalidatePath(`/app/${businessSlug}`);
    return { ok: true, scope: result.scope };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Manual app logic failed.",
    };
  }
}
