"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, ImageIcon, Save, X } from "lucide-react";
import { updatePlantIntake } from "@/lib/actions/data-entries";
import { formatAppDate } from "@/lib/date-format";

export type PlantIntakeRow = {
  id: string;
  date: string | null;
  source: string;
  genus: string;
  cultivar: string;
  locationCode: string | null;
  sku: string;
  qty: number;
  costCents: number;
  totalCostCents: number;
  msrpCents: number;
  potType: string | null;
  paymentMethod: string | null;
  cardLast4: string | null;
};

type EditablePlantField =
  | "date"
  | "source"
  | "genus"
  | "cultivar"
  | "locationCode"
  | "qty"
  | "costCents"
  | "msrpCents"
  | "potType"
  | "paymentMethod"
  | "cardLast4";

type DraftRows = Record<string, Partial<Record<EditablePlantField, string>>>;

function currencyInputValue(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseCurrencyCents(value: string) {
  const amount = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function rowFieldValue(row: PlantIntakeRow, field: EditablePlantField) {
  if (field === "date") return row.date ?? "";
  if (field === "locationCode") return row.locationCode ?? "";
  if (field === "qty") return String(row.qty);
  if (field === "costCents") return currencyInputValue(row.costCents);
  if (field === "msrpCents") return currencyInputValue(row.msrpCents);
  if (field === "potType") return row.potType ?? "";
  if (field === "paymentMethod") return row.paymentMethod ?? "";
  if (field === "cardLast4") return row.cardLast4 ?? "";
  return row[field];
}

function displayCurrency(cents: number) {
  return `$${currencyInputValue(cents)}`;
}

export default function PlantIntakeTable({
  rows,
  businessSlug,
  selectedId,
  onSelectedIdChange,
  selectMode = false,
  editMode = false,
  onEditModeChange,
}: {
  rows: PlantIntakeRow[];
  businessSlug: string;
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  selectMode?: boolean;
  editMode?: boolean;
  onEditModeChange?: (value: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  const [draftRows, setDraftRows] = useState<DraftRows>({});
  const dirtyCount = Object.keys(draftRows).length;

  useEffect(() => {
    if (!selectMode) setSelectedRows(new Set());
  }, [selectMode]);

  useEffect(() => {
    if (!editMode) setDraftRows({});
  }, [editMode]);

  function setDraftValue(id: string, field: EditablePlantField, value: string) {
    setDraftRows((current) => {
      const row = rows.find((item) => item.id === id);
      if (!row) return current;

      const original = rowFieldValue(row, field);
      const nextRow = { ...(current[id] ?? {}) };
      if (value === original) delete nextRow[field];
      else nextRow[field] = value;

      const next = { ...current };
      if (Object.keys(nextRow).length === 0) delete next[id];
      else next[id] = nextRow;
      return next;
    });
  }

  function toggleSelectedRow(id: string) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllRows() {
    setSelectedRows((current) => {
      if (current.size === rows.length) return new Set();
      return new Set(rows.map((row) => row.id));
    });
  }

  function handleRowClick(row: PlantIntakeRow) {
    if (editMode) return;
    if (selectMode) {
      toggleSelectedRow(row.id);
      return;
    }
    onSelectedIdChange(row.id);
  }

  function cancelEdits() {
    setDraftRows({});
    onEditModeChange?.(false);
  }

  async function saveEdits() {
    setIsSaving(true);
    try {
      for (const [id, draft] of Object.entries(draftRows)) {
        const row = rows.find((item) => item.id === id);
        if (!row) continue;

        const payload: Parameters<typeof updatePlantIntake>[2] = {};
        if (draft.date !== undefined) payload.date = draft.date || null;
        if (draft.source !== undefined) payload.source = draft.source;
        if (draft.genus !== undefined) payload.genus = draft.genus;
        if (draft.cultivar !== undefined) payload.cultivar = draft.cultivar;
        if (draft.locationCode !== undefined) payload.locationCode = draft.locationCode || null;
        if (draft.qty !== undefined) {
          const qty = Number.parseInt(draft.qty, 10);
          if (Number.isFinite(qty)) payload.qty = Math.max(1, qty);
        }
        if (draft.costCents !== undefined) payload.costCents = parseCurrencyCents(draft.costCents);
        if (draft.msrpCents !== undefined) payload.msrpCents = parseCurrencyCents(draft.msrpCents);
        if (draft.potType !== undefined) payload.potType = draft.potType || null;
        if (draft.paymentMethod !== undefined) payload.paymentMethod = draft.paymentMethod || null;
        if (draft.cardLast4 !== undefined) payload.cardLast4 = draft.cardLast4 || null;

        await updatePlantIntake(id, businessSlug, payload);
      }

      setDraftRows({});
      onEditModeChange?.(false);
      startTransition(() => router.refresh());
    } finally {
      setIsSaving(false);
    }
  }

  function draftValue(row: PlantIntakeRow, field: EditablePlantField) {
    return draftRows[row.id]?.[field] ?? rowFieldValue(row, field);
  }

  function renderEditable(row: PlantIntakeRow, field: EditablePlantField, type = "text") {
    if (!editMode) {
      if (field === "date") return formatAppDate(row.date, "-");
      if (field === "costCents") return displayCurrency(row.costCents);
      if (field === "msrpCents") return displayCurrency(row.msrpCents);
      return rowFieldValue(row, field) || "-";
    }

    return (
      <input
        value={draftValue(row, field)}
        type={type}
        min={field === "qty" ? 1 : undefined}
        step={field === "costCents" || field === "msrpCents" ? "0.01" : undefined}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => setDraftValue(row.id, field, event.target.value)}
        className="h-7 w-full min-w-0 rounded-sm border border-green-500 bg-white px-2 text-xs text-gray-900 outline-none focus:ring-1 focus:ring-green-500"
      />
    );
  }

  const headCell =
    "sticky top-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-800";
  const bodyCell =
    "border-b border-r border-gray-200 px-3 py-1.5 align-middle text-xs text-gray-700";
  const modeActive = editMode || selectMode;

  return (
    <div>
      {editMode ? (
        <div className="sticky top-14 z-20 flex min-h-11 items-center justify-between border-b border-green-200 bg-green-50 px-4 text-sm">
          <span className="text-gray-700">
            {dirtyCount === 0 ? "Edit mode" : `${dirtyCount} row${dirtyCount === 1 ? "" : "s"} with unsaved changes`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelEdits}
              className="inline-flex h-8 items-center gap-1 rounded-sm border border-gray-300 bg-white px-3 text-gray-700 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdits}
              disabled={dirtyCount === 0 || isSaving}
              className="inline-flex h-8 items-center gap-1 rounded-sm bg-[#08bd12] px-3 font-medium text-white hover:bg-[#08aa12] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving" : "Save"}
            </button>
          </div>
        </div>
      ) : null}

      {selectMode ? (
        <div className="flex h-10 items-center border-b border-gray-200 bg-gray-50 px-4 text-sm text-gray-700">
          {selectedRows.size} row{selectedRows.size === 1 ? "" : "s"} selected
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="px-4 py-4 text-center text-sm text-gray-500 md:hidden">
          No plant intake records yet.
        </p>
      ) : (
        <div className="space-y-2 p-3 md:hidden">
          {rows.map((row) => (
            <div
              key={row.id}
              onClick={() => handleRowClick(row)}
              onKeyDown={(event) => {
                if (event.currentTarget !== event.target || editMode) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleRowClick(row);
                }
              }}
              role="button"
              tabIndex={editMode ? undefined : 0}
              aria-pressed={selectedRows.has(row.id) || selectedId === row.id}
              className={`cursor-pointer rounded-md border p-3 active:bg-green-50 ${
                selectedRows.has(row.id) || selectedId === row.id
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                {selectMode ? (
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm border border-gray-300 bg-white">
                    {selectedRows.has(row.id) ? <Check className="h-4 w-4 text-[#08bd12]" /> : null}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatAppDate(row.date, "-")}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {row.sku} - {row.source} - qty {row.qty}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {row.genus} {row.cultivar}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1520px] border-collapse bg-white">
          <thead>
            <tr>
              {selectMode ? (
                <th className={`${headCell} w-12 text-center`}>
                  <button
                    type="button"
                    onClick={toggleAllRows}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-gray-300 bg-white"
                    aria-label="Select all visible rows"
                    aria-pressed={rows.length > 0 && selectedRows.size === rows.length}
                  >
                    {rows.length > 0 && selectedRows.size === rows.length ? (
                      <Check className="h-4 w-4 text-[#08bd12]" />
                    ) : null}
                  </button>
                </th>
              ) : null}
              <th className={`${headCell} w-24`}>
                <span className="inline-flex items-center gap-1">
                  Date <ChevronDown className="h-3 w-3" />
                </span>
              </th>
              <th className={`${headCell} w-40`}>Source</th>
              <th className={`${headCell} w-36`}>Genus</th>
              <th className={`${headCell} w-56`}>Cultivar</th>
              <th className={`${headCell} w-20`}>ID #</th>
              <th className={`${headCell} w-36`}>SKU</th>
              <th className={`${headCell} w-16`}>QTY</th>
              <th className={`${headCell} w-24`}>Total Cost</th>
              <th className={`${headCell} w-24`}>Unit Cost</th>
              <th className={`${headCell} w-24`}>MSRP</th>
              <th className={`${headCell} w-32`}>Pot Type</th>
              <th className={`${headCell} w-20`}>Photo</th>
              <th className={`${headCell} w-36`}>Payment Method</th>
              <th className={`${headCell} w-36`}>Card Number</th>
              <th
                className="sticky top-0 z-10 w-8 border-b border-gray-200 bg-white px-2 py-2"
                aria-label="Open row"
              />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={selectMode ? 16 : 15}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No plant intake records yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowSelected = selectedRows.has(row.id);
                const detailSelected = selectedId === row.id && !editMode && !selectMode;
                return (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    onKeyDown={(event) => {
                      if (event.currentTarget !== event.target || editMode) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleRowClick(row);
                      }
                    }}
                    tabIndex={editMode ? undefined : 0}
                    aria-selected={rowSelected || detailSelected}
                    className={`h-9 ${
                      modeActive ? "" : "cursor-pointer hover:bg-green-50/50"
                    } ${rowSelected || detailSelected ? "bg-green-50" : ""}`}
                  >
                    {selectMode ? (
                      <td className={`${bodyCell} text-center`}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSelectedRow(row.id);
                          }}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-gray-300 bg-white"
                          aria-label={`Select ${row.sku}`}
                          aria-pressed={rowSelected}
                        >
                          {rowSelected ? <Check className="h-4 w-4 text-[#08bd12]" /> : null}
                        </button>
                      </td>
                    ) : null}
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "date", "date")}</td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "source")}</td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "genus")}</td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "cultivar")}</td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "locationCode")}</td>
                    <td className={`${bodyCell} whitespace-nowrap`}>
                      <span className="font-mono text-xs text-gray-700">{row.sku}</span>
                    </td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "qty", "number")}</td>
                    <td className={`${bodyCell} whitespace-nowrap`}>
                      {displayCurrency((draftRows[row.id]?.costCents !== undefined
                        ? parseCurrencyCents(draftRows[row.id]?.costCents ?? "0")
                        : row.costCents) * (draftRows[row.id]?.qty !== undefined
                        ? Math.max(1, Number.parseInt(draftRows[row.id]?.qty ?? "1", 10) || 1)
                        : row.qty))}
                    </td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "costCents", "number")}</td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "msrpCents", "number")}</td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "potType")}</td>
                    <td className={`${bodyCell} whitespace-nowrap text-center`}>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-gray-100 text-gray-400">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </span>
                    </td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "paymentMethod")}</td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{renderEditable(row, "cardLast4")}</td>
                    <td className="border-b border-gray-200 px-2 py-1.5 text-gray-900">
                      {!modeActive ? <ChevronRight className="h-4 w-4" /> : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(isPending || isSaving) && (
        <p className="mt-2 px-4 text-xs text-gray-500">
          {isSaving ? "Saving edits..." : "Refreshing..."}
        </p>
      )}

    </div>
  );
}
