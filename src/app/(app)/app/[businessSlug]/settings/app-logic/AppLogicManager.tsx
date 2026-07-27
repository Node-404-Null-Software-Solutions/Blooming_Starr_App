"use client";

import { useState, useTransition } from "react";
import {
  createAppLogicRule,
  deleteAppLogicRule,
  listAppLogicExecutionLogs,
  listManualAppLogicRows,
  previewAppLogicRule,
  runManualAppLogic,
  updateAppLogicRule,
} from "@/lib/actions/app-logic";
import {
  APP_LOGIC_MODES,
  APP_LOGIC_MODULES,
  APP_LOGIC_TRIGGERS,
  getAppLogicModuleContract,
  getAppLogicSelectionMessage,
  isExecutableAppLogicSelection,
} from "@/lib/app-logic-options";
import type {
  AppLogicExecutionLogRow,
  AppLogicRuleRow,
  ManualAppLogicRowOption,
} from "@/lib/app-logic-options";
import {
  APP_LOGIC_ACTION_TRIGGERS,
  APP_LOGIC_MODULE_ACTIONS,
  isAppLogicMode,
  isAppLogicModule,
  isAppLogicTrigger,
  isExecutableAppLogicModule,
} from "@/lib/app-logic-contract";
import type {
  AppLogicMode,
  AppLogicModule,
  AppLogicTrigger,
} from "@/lib/app-logic-contract";
import type { AppLogicPreviewResult } from "@/lib/app-logic-preview";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

type Props = {
  businessSlug: string;
  initialRules: AppLogicRuleRow[];
  initialLogs: AppLogicExecutionLogRow[];
};

type Draft = {
  name: string;
  module: AppLogicModule;
  trigger: AppLogicTrigger;
  mode: AppLogicMode;
  expression: string;
  notes: string;
  enabled: boolean;
};

const emptyDraft: Draft = {
  name: "",
  module: "productIntake",
  trigger: "beforeSave",
  mode: "FORMULA",
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

function sampleInputFor(module: AppLogicModule): string {
  const contract = getAppLogicModuleContract(module);
  return JSON.stringify(contract?.sampleScope ?? {}, null, 2);
}

function moduleSupportsGovernedActions(module: AppLogicModule): boolean {
  return (
    isExecutableAppLogicModule(module) &&
    APP_LOGIC_MODULE_ACTIONS[module].length > 0
  );
}

function PreviewPanel({
  businessSlug,
  draft,
  inputClass,
  onLogged,
}: {
  businessSlug: string;
  draft: Draft;
  inputClass: string;
  onLogged: () => Promise<void>;
}) {
  const [input, setInput] = useState(() => sampleInputFor(draft.module));
  const [result, setResult] = useState<AppLogicPreviewResult | null>(null);
  const [inputError, setInputError] = useState("");
  const [isPending, startTransition] = useTransition();

  function runPreview() {
    setInputError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      setInputError("Sample input must be valid JSON.");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setInputError("Sample input must be a JSON object.");
      return;
    }

    startTransition(async () => {
      const nextResult = await previewAppLogicRule(businessSlug, {
        module: draft.module,
        trigger: draft.trigger,
        mode: draft.mode,
        expression: draft.expression,
        input: parsed as Record<string, unknown>,
      });
      setResult(nextResult);
      await onLogged();
    });
  }

  return (
    <div className="mt-4 rounded-md border border-blue-100 bg-blue-50/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Server preview</h3>
          <p className="mt-0.5 text-xs text-gray-600">
            Uses the production parser and sandbox. Governed actions are reported,
            never executed during preview.
          </p>
        </div>
        <button
          type="button"
          onClick={runPreview}
          disabled={isPending || !draft.expression.trim()}
          className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {isPending ? "Running…" : "Run Preview"}
        </button>
      </div>

      <label className="mt-3 grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Sample row (JSON)
        </span>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className={`${inputClass} min-h-36 font-mono`}
          spellCheck={false}
        />
      </label>

      {inputError && <p className="mt-2 text-sm text-red-600">{inputError}</p>}
      {result && !result.ok && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.errorCode}: {result.error}
        </p>
      )}
      {result?.ok && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Diagnostics
            </p>
            <div className="mt-1 space-y-1 text-sm text-gray-700">
              <p>
                {result.statementCount} statement(s), {result.actionCount} action
                intent(s)
              </p>
              <p>
                Changed: {result.changedFields.length === 0
                  ? "none"
                  : result.changedFields
                      .map(
                        (change) =>
                          `${change.field}: ${change.before} → ${change.after}`
                      )
                      .join(", ")}
              </p>
              {result.actions.length > 0 && (
                <p>
                  Actions: {result.actions
                    .map((action) => `${action.action} (line ${action.line})`)
                    .join(", ")}
                </p>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Output row
            </p>
            <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-gray-950 p-3 text-xs text-gray-100">
              {JSON.stringify(result.output, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

type ManualModule = "sales" | "productIntake" | "overheadExpenses";

function ManualRunner({
  businessSlug,
  inputClass,
  onLogged,
}: {
  businessSlug: string;
  inputClass: string;
  onLogged: () => Promise<void>;
}) {
  const [module, setModule] = useState<ManualModule>("sales");
  const [rows, setRows] = useState<ManualAppLogicRowOption[]>([]);
  const [rowId, setRowId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function loadRows(nextModule: ManualModule = module) {
    setMessage("");
    startTransition(async () => {
      const result = await listManualAppLogicRows(businessSlug, nextModule);
      setRows(result.rows);
      setRowId(result.rows[0]?.id ?? "");
      if (!result.ok) setMessage(result.error ?? "Could not load rows.");
      if (result.ok && result.rows.length === 0) {
        setMessage("No rows are available for this module.");
      }
    });
  }

  function runRules() {
    if (!rowId) {
      setMessage("Load and select a row first.");
      return;
    }
    setMessage("");
    startTransition(async () => {
      const result = await runManualAppLogic(businessSlug, module, rowId);
      setMessage(
        result.ok
          ? "Manual rules completed and the row was updated."
          : result.error ?? "Manual rules failed."
      );
      await onLogged();
    });
  }

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4">
      <h2 className="font-semibold text-gray-900">Manual execution</h2>
      <p className="mt-1 text-sm text-gray-500">
        Run active Manual rules against one recent row in this business.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-[0.8fr_1.6fr_auto_auto] md:items-end">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Module
          </span>
          <select
            value={module}
            onChange={(event) => {
              const nextModule = event.target.value as ManualModule;
              setModule(nextModule);
              setRows([]);
              setRowId("");
              setMessage("");
            }}
            className={inputClass}
          >
            <option value="sales">Sales</option>
            <option value="productIntake">Product Intake</option>
            <option value="overheadExpenses">Overhead Expenses</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Business row
          </span>
          <select
            value={rowId}
            onChange={(event) => setRowId(event.target.value)}
            className={inputClass}
            disabled={rows.length === 0}
          >
            {rows.length === 0 && <option value="">Load recent rows</option>}
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => loadRows()}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Load Rows
        </button>
        <button
          type="button"
          onClick={runRules}
          disabled={isPending || !rowId}
          className="rounded-md bg-[#0E4D3A] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Run Rules
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </section>
  );
}

function ExecutionHistory({ logs }: { logs: AppLogicExecutionLogRow[] }) {
  return (
    <section className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="px-4 py-3">
        <h2 className="font-semibold text-gray-900">Execution history</h2>
        <p className="mt-1 text-sm text-gray-500">
          The latest tenant-scoped rule executions, including previews and failures.
        </p>
      </div>
      <div className="overflow-x-auto border-t border-gray-200">
        <table className="w-full min-w-[940px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600">Rule</th>
              <th className="px-4 py-3 font-medium text-gray-600">Context</th>
              <th className="px-4 py-3 font-medium text-gray-600">Source</th>
              <th className="px-4 py-3 font-medium text-gray-600">Work</th>
              <th className="px-4 py-3 font-medium text-gray-600">When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      log.status === "SUCCEEDED"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-gray-900">{log.ruleName}</div>
                  {log.errorMessage && (
                    <div className="mt-1 max-w-sm text-xs text-red-600">
                      {log.errorCode ? `${log.errorCode}: ` : ""}
                      {log.errorMessage}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-gray-700">
                  {labelFor(APP_LOGIC_MODULES, log.module)} ·{" "}
                  {labelFor(APP_LOGIC_TRIGGERS, log.trigger)}
                </td>
                <td className="px-4 py-3 align-top text-gray-700">
                  {log.source}
                  {log.sourceRowId && (
                    <div className="mt-1 max-w-36 truncate font-mono text-xs text-gray-500">
                      {log.sourceRowId}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-gray-700">
                  {log.statementCount} stmt · {log.actionCount} action ·{" "}
                  {log.durationMs}ms
                </td>
                <td className="px-4 py-3 align-top text-gray-600">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs.length === 0 && (
        <div className="border-t border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          No rule executions have been recorded yet.
        </div>
      )}
    </section>
  );
}

export default function AppLogicManager({
  businessSlug,
  initialRules,
  initialLogs,
}: Props) {
  const [rules, setRules] = useState(initialRules);
  const [logs, setLogs] = useState(initialLogs);
  const [adding, setAdding] = useState(initialRules.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 outline-none focus:border-[#0E4D3A] focus:ring-1 focus:ring-[#0E4D3A]";
  const selectionIsExecutable = isExecutableAppLogicSelection(
    draft.module,
    draft.trigger,
    draft.mode
  );
  const selectionMessage = getAppLogicSelectionMessage(
    draft.module,
    draft.trigger,
    draft.mode
  );
  const moduleContract = getAppLogicModuleContract(draft.module);

  async function refreshLogs() {
    setLogs(await listAppLogicExecutionLogs(businessSlug));
  }

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
            onChange={(event) => {
              const nextModule = event.target.value;
              if (!isAppLogicModule(nextModule)) return;
              setDraft((prev) => ({
                ...prev,
                module: nextModule,
                enabled:
                  prev.enabled &&
                  isExecutableAppLogicSelection(
                    nextModule,
                    prev.trigger,
                    prev.mode
                  ),
              }));
            }}
            className={inputClass}
          >
            {APP_LOGIC_MODULES.map((module) => (
              <option
                key={module.value}
                value={module.value}
                disabled={!module.available}
              >
                {module.label}{module.available ? "" : " (Planned)"}
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
            onChange={(event) => {
              const nextTrigger = event.target.value;
              if (!isAppLogicTrigger(nextTrigger)) return;
              setDraft((prev) => ({
                ...prev,
                trigger: nextTrigger,
                enabled:
                  prev.enabled &&
                  isExecutableAppLogicSelection(
                    prev.module,
                    nextTrigger,
                    prev.mode
                  ),
              }));
            }}
            className={inputClass}
          >
            {APP_LOGIC_TRIGGERS.map((trigger) => (
              <option
                key={trigger.value}
                value={trigger.value}
                disabled={!trigger.available}
              >
                {trigger.label}{trigger.available ? "" : " (Planned)"}
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
            onChange={(event) => {
              const nextMode = event.target.value;
              if (!isAppLogicMode(nextMode)) return;
              setDraft((prev) => ({
                ...prev,
                mode: nextMode,
                enabled:
                  prev.enabled &&
                  isExecutableAppLogicSelection(
                    prev.module,
                    prev.trigger,
                    nextMode
                  ),
              }));
            }}
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
          {draft.mode === "FORMULA" ? "Formula" : "Script"}
        </span>
        <textarea
          value={draft.expression}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, expression: event.target.value }))
          }
          className={`${inputClass} min-h-32 font-mono`}
          spellCheck={false}
          placeholder={
            draft.mode === "FORMULA"
              ? "totalSaleCents = qty * salePriceCents"
              : "SET totalSaleCents = qty * salePriceCents"
          }
        />
      </label>

      {moduleContract && (
        <div className="mt-2 space-y-1 text-xs text-gray-500">
          <p>
            Available fields: {moduleContract.readableFields.join(", ")}
          </p>
          <p>
            Writable outputs: {moduleContract.writableFields.join(", ")}
          </p>
          {draft.mode === "SCRIPT" && (
            <p>
              Syntax: SET field = expression or REQUIRE expression
              {moduleSupportsGovernedActions(draft.module) &&
              (APP_LOGIC_ACTION_TRIGGERS as readonly string[]).includes(
                draft.trigger
              )
                ? "; ACTION SYNC_PRODUCT_MASTER is also available"
                : ""}
              .
            </p>
          )}
        </div>
      )}

      <PreviewPanel
        key={draft.module}
        businessSlug={businessSlug}
        draft={draft}
        inputClass={inputClass}
        onLogged={refreshLogs}
      />

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
            disabled={!selectionIsExecutable && !draft.enabled}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, enabled: event.target.checked }))
            }
            className="h-4 w-4 rounded border-gray-300 text-[#0E4D3A] focus:ring-[#0E4D3A] disabled:cursor-not-allowed disabled:opacity-50"
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

      {selectionMessage && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {selectionMessage}
        </p>
      )}

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

      <ManualRunner
        businessSlug={businessSlug}
        inputClass={inputClass}
        onLogged={refreshLogs}
      />

      <ExecutionHistory logs={logs} />
    </div>
  );
}
