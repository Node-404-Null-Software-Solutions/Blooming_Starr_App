"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  ensureDefaultAppLogicRules,
  validateAppLogicExpression,
} from "@/lib/app-logic-engine";
import {
  APP_LOGIC_MODES,
  APP_LOGIC_MODULES,
  APP_LOGIC_TRIGGERS,
} from "@/lib/app-logic-options";
import type { AppLogicRuleRow } from "@/lib/app-logic-options";

const MODULE_VALUES: Set<string> = new Set(
  APP_LOGIC_MODULES.map((item) => item.value)
);
const TRIGGER_VALUES: Set<string> = new Set(
  APP_LOGIC_TRIGGERS.map((item) => item.value)
);
const MODE_VALUES: Set<string> = new Set(
  APP_LOGIC_MODES.map((item) => item.value)
);

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
  if (!MODULE_VALUES.has(targetModule)) return { ok: false as const, error: "Choose a module." };
  if (!TRIGGER_VALUES.has(trigger)) return { ok: false as const, error: "Choose a trigger." };
  if (!MODE_VALUES.has(mode)) return { ok: false as const, error: "Choose a rule type." };
  if (!expression) return { ok: false as const, error: "Formula or script is required." };
  if (expression.length > 5000) {
    return { ok: false as const, error: "Formula or script is too long." };
  }
  const validation = validateAppLogicExpression(targetModule, expression);
  if (!validation.ok) {
    return { ok: false as const, error: validation.error };
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

export async function listAppLogicRules(): Promise<AppLogicRuleRow[]> {
  const { business } = await requireRole(["OWNER"]);
  await ensureDefaultAppLogicRules(business.id);

  return db.appLogicRule.findMany({
    where: { businessId: business.id },
    select: {
      id: true,
      name: true,
      module: true,
      trigger: true,
      mode: true,
      expression: true,
      notes: true,
      enabled: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createAppLogicRule(
  businessSlug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const { business } = await requireRole(["OWNER"]);
  const parsed = readRuleForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const count = await db.appLogicRule.count({
    where: { businessId: business.id },
  });

  await db.appLogicRule.create({
    data: {
      ...parsed.data,
      businessId: business.id,
      sortOrder: count,
    },
  });

  revalidatePath(`/app/${businessSlug}/settings/app-logic`);
  return { ok: true };
}

export async function updateAppLogicRule(
  id: string,
  businessSlug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const { business } = await requireRole(["OWNER"]);
  const parsed = readRuleForm(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const existing = await db.appLogicRule.findFirst({
    where: { id, businessId: business.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Rule not found." };

  await db.appLogicRule.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath(`/app/${businessSlug}/settings/app-logic`);
  return { ok: true };
}

export async function deleteAppLogicRule(
  id: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { business } = await requireRole(["OWNER"]);

  const existing = await db.appLogicRule.findFirst({
    where: { id, businessId: business.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Rule not found." };

  await db.appLogicRule.delete({ where: { id } });

  revalidatePath(`/app/${businessSlug}/settings/app-logic`);
  return { ok: true };
}
