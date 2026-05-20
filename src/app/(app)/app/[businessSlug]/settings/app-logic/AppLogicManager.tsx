"use client";

import { useState, useTransition } from "react";
import {
  createAppLogicRule,
  deleteAppLogicRule,
  updateAppLogicRule,
} from "@/lib/actions/app-logic";
import {
  APP_LOGIC_MODES,
  APP_LOGIC_MODULES,
  APP_LOGIC_TRIGGERS,
} from "@/lib/app-logic-options";
import type { AppLogicRuleRow } from "@/lib/app-logic-options";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

type Props = {
  businessSlug: string;
  initialRules: AppLogicRuleRow[];
};

type Draft = {
  name: string;
  module: string;
  trigger: string;
  mode: string;
  expression: string;
  notes: string;
  enabled: boolean;
};

const emptyDraft: Draft = {
  name: "",
  module: APP_LOGIC_MODULES[0].value,
  trigger: APP_LOGIC_TRIGGERS[0].value,
  mode: APP_LOGIC_MODES[0].value,
  expression: "",
  notes: "",
  enabled: false,
};

function draftFromRule(rule: AppLogicRuleRow): Draft {
  return {
    name: rule.name,
    module: rule.module,
    trigger: rule.trigger,
    mode: rule.mode,
    expression: rule.expression,
    notes: rule.notes ?? "",
    enabled: rule.enabled,
  };
}

function toFormData(draft: Draft): FormData {
  const formData = new FormData();
  formData.set("name", draft.name);
  formData.set("module", draft.module);
  formData.set("trigger", draft.trigger);
  formData.set("mode", draft.mode);
  formData.set("expression", draft.expression);
  formData.set("notes", draft.notes);
  if (draft.enabled) formData.set("enabled", "on");
  return formData;
}

function labelFor(
  list: readonly { value: string; label: string }[],
  value: string
): string {
  return list.find((item) => item.value === value)?.label ?? value;
}

export default function AppLogicManager({ businessSlug, initialRules }: Props) {
  const [rules, setRules] = useState(initialRules);
  const [adding, setAdding] = useState(initialRules.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-[#0E4D3A] focus:ring-1 focus:ring-[#0E4D3A]";

  function resetDraft() {
    setDraft(emptyDraft);
    setError("");
    setAdding(false);
    setEditingId(null);
  }

  function startEdit(rule: AppLogicRuleRow) {
    setDraft(draftFromRule(rule));
    setEditingId(rule.id);
    setAdding(false);
    setError("");
  }

  function handleCreate() {
    setError("");
    startTransition(async () => {
      const result = await createAppLogicRule(businessSlug, toFormData(draft));
      if (!result.ok) {
        setError(result.error ?? "Could not create rule.");
        return;
      }

      const optimistic: AppLogicRuleRow = {
        id: crypto.randomUUID(),
        ...draft,
        notes: draft.notes || null,
        sortOrder: rules.length,
      };
      setRules((prev) => [...prev, optimistic]);
      resetDraft();
    });
  }

  function handleUpdate(id: string) {
    setError("");
    startTransition(async () => {
      const result = await updateAppLogicRule(id, businessSlug, toFormData(draft));
      if (!result.ok) {
        setError(result.error ?? "Could not update rule.");
        return;
      }

      setRules((prev) =>
        prev.map((rule) =>
          rule.id === id
            ? {
                ...rule,
                ...draft,
                notes: draft.notes || null,
              }
            : rule
        )
      );
      resetDraft();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteAppLogicRule(id, businessSlug);
      if (!result.ok) {
        setError(result.error ?? "Could not delete rule.");
        return;
      }
      setRules((prev) => prev.filter((rule) => rule.id !== id));
    });
  }

  const editor = (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr_0.9fr_0.7fr]">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Name
          </span>
          <input
            value={draft.name}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, name: event.target.value }))
            }
            className={inputClass}
            placeholder="Auto-price plant sale"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Module
          </span>
          <select
            value={draft.module}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, module: event.target.value }))
            }
            className={inputClass}
          >
            {APP_LOGIC_MODULES.map((module) => (
              <option key={module.value} value={module.value}>
                {module.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Trigger
          </span>
          <select
            value={draft.trigger}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, trigger: event.target.value }))
            }
            className={inputClass}
          >
            {APP_LOGIC_TRIGGERS.map((trigger) => (
              <option key={trigger.value} value={trigger.value}>
                {trigger.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Type
          </span>
          <select
            value={draft.mode}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, mode: event.target.value }))
            }
            className={inputClass}
          >
            {APP_LOGIC_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Formula or script
        </span>
        <textarea
          value={draft.expression}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, expression: event.target.value }))
          }
          className={`${inputClass} min-h-32 font-mono`}
          spellCheck={false}
          placeholder="totalSaleCents = qty * salePriceCents"
        />
      </label>

      <label className="mt-3 grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Notes
        </span>
        <input
          value={draft.notes}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, notes: event.target.value }))
          }
          className={inputClass}
          placeholder="Use this for wholesale orders"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, enabled: event.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300 text-[#0E4D3A] focus:ring-[#0E4D3A]"
          />
          Active
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              editingId ? handleUpdate(editingId) : handleCreate()
            }
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0E4D3A] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Save Rule
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      {adding || editingId ? (
        editor
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(emptyDraft);
            setAdding(true);
            setError("");
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0E4D3A] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </button>
      )}

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Rule</th>
                <th className="px-4 py-3 font-medium text-gray-600">Module</th>
                <th className="px-4 py-3 font-medium text-gray-600">Trigger</th>
                <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="w-24 px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{rule.name}</div>
                    <div className="mt-1 max-w-xl truncate font-mono text-xs text-gray-500">
                      {rule.expression}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {labelFor(APP_LOGIC_MODULES, rule.module)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {labelFor(APP_LOGIC_TRIGGERS, rule.trigger)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {labelFor(APP_LOGIC_MODES, rule.mode)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        rule.enabled
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {rule.enabled ? "Active" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(rule)}
                        className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(rule.id)}
                        className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rules.length === 0 && !adding && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No app logic rules yet.
          </div>
        )}
      </div>
    </div>
  );
}
