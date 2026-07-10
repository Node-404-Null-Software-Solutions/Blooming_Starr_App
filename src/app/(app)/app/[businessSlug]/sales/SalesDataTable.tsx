"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { EditableCell } from "@/components/data-table/EditableCell";
import { formatAppDate } from "@/lib/date-format";

export type SalesRow = {
  id: string;
  date: string | null;
  sku: string;
  itemName: string | null;
  qty: number;
  salePriceCents: number;
  totalSaleCents: number;
  paymentMethod: string | null;
  cardLast4: string | null;
  channel: string | null;
  costCents: number;
  profitCents: number;
  marginPct: number | null;
  notes: string | null;
};

export type EditableSalesField =
  | "date"
  | "sku"
  | "itemName"
  | "qty"
  | "salePriceCents"
  | "paymentMethod"
  | "cardLast4"
  | "channel"
  | "costCents"
  | "notes";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function margin(value: number | null) {
  return value == null ? "" : `${value.toFixed(2)}%`;
}

function fieldValue(row: SalesRow, field: EditableSalesField) {
  if (field === "date") return row.date ? row.date.slice(0, 10) : "";
  if (field === "qty") return String(row.qty);
  if (field === "salePriceCents") return String(row.salePriceCents);
  if (field === "costCents") return String(row.costCents);
  return row[field] ?? "";
}

function displayValue(row: SalesRow, field: EditableSalesField) {
  if (field === "date") return formatAppDate(row.date, "-");
  if (field === "qty") return row.qty.toFixed(2);
  if (field === "salePriceCents") return money(row.salePriceCents);
  if (field === "costCents") return money(row.costCents);
  return fieldValue(row, field) || "";
}

export default function SalesDataTable({
  initialRows,
  selectedId,
  onSelectedIdChange,
  onSave,
  isPending = false,
  selectMode = false,
  editMode = false,
}: {
  initialRows: SalesRow[];
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  onSave: (id: string, field: EditableSalesField, value: string) => void;
  isPending?: boolean;
  selectMode?: boolean;
  editMode?: boolean;
}) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());

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
      if (current.size === initialRows.length) return new Set();
      return new Set(initialRows.map((row) => row.id));
    });
  }

  function handleRowClick(row: SalesRow) {
    if (editMode) return;
    if (selectMode) {
      toggleSelectedRow(row.id);
      return;
    }
    onSelectedIdChange(row.id);
  }

  function renderCell(row: SalesRow, field: EditableSalesField, type: "text" | "currency" | "number" | "date" = "text") {
    if (!editMode) return displayValue(row, field);

    return (
      <div onClick={(event) => event.stopPropagation()}>
        <EditableCell
          value={fieldValue(row, field)}
          onSave={(value) => onSave(row.id, field, value)}
          type={type}
        />
      </div>
    );
  }

  const headCell =
    "sticky top-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-800";
  const bodyCell =
    "border-b border-r border-gray-200 px-3 py-1.5 align-middle text-xs text-gray-700";
  const modeActive = editMode || selectMode;

  return (
    <div>
      {selectMode ? (
        <div className="flex h-10 items-center border-b border-gray-200 bg-gray-50 px-4 text-sm text-gray-700">
          {selectedRows.size} row{selectedRows.size === 1 ? "" : "s"} selected
        </div>
      ) : null}

      <div className="space-y-2 p-3 md:hidden">
        {initialRows.map((row) => (
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
                  {row.itemName || row.sku} - qty {row.qty.toFixed(2)} - {money(row.totalSaleCents ?? 0)}
                </p>
                {row.channel && <p className="mt-0.5 text-xs text-gray-400">{row.channel}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1880px] border-collapse bg-white">
          <thead>
            <tr>
              {selectMode ? (
                <th className={`${headCell} w-12 text-center`}>
                  <button
                    type="button"
                    onClick={toggleAllRows}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-gray-300 bg-white"
                    aria-label="Select all visible rows"
                    aria-pressed={initialRows.length > 0 && selectedRows.size === initialRows.length}
                  >
                    {initialRows.length > 0 && selectedRows.size === initialRows.length ? (
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
              <th className={`${headCell} w-40`}>Customer Name</th>
              <th className={`${headCell} w-72`}>Item Name</th>
              <th className={`${headCell} w-36`}>SKU</th>
              <th className={`${headCell} w-24`}>Status</th>
              <th className={`${headCell} w-16`}>Qty</th>
              <th className={`${headCell} w-24`}>Cost</th>
              <th className={`${headCell} w-24`}>Sale Price</th>
              <th className={`${headCell} w-24`}>Total Sale</th>
              <th className={`${headCell} w-24`}>Profit</th>
              <th className={`${headCell} w-24`}>Margin %</th>
              <th className={`${headCell} w-44`}>Sale Channel</th>
              <th className={`${headCell} w-40`}>Payment Method</th>
              <th className={`${headCell} w-24`}>Card #</th>
              <th className={`${headCell} w-56`}>Notes</th>
              <th className="sticky top-0 z-10 w-8 border-b border-gray-200 bg-white px-2 py-2" aria-label="Open row" />
            </tr>
          </thead>
          <tbody>
            {initialRows.map((row) => {
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
                        aria-label={`Select ${row.itemName || row.sku}`}
                        aria-pressed={rowSelected}
                      >
                        {rowSelected ? <Check className="h-4 w-4 text-[#08bd12]" /> : null}
                      </button>
                    </td>
                  ) : null}
                  <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "date", "date")}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}></td>
                  <td className={`${bodyCell} max-w-72 truncate`} title={row.itemName ?? ""}>{renderCell(row, "itemName")}</td>
                  <td className={`${bodyCell} whitespace-nowrap font-mono`}>{renderCell(row, "sku")}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>Sold</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "qty", "number")}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "costCents", "currency")}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "salePriceCents", "currency")}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{money(row.totalSaleCents ?? 0)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{money(row.profitCents ?? 0)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{margin(row.marginPct)}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "channel")}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "paymentMethod")}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "cardLast4")}</td>
                  <td className={`${bodyCell} max-w-56 truncate`} title={row.notes ?? ""}>{renderCell(row, "notes")}</td>
                  <td className="border-b border-gray-200 px-2 py-1.5 text-gray-900">
                    {!modeActive ? <ChevronRight className="h-4 w-4" /> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isPending && <p className="mt-2 px-4 text-xs text-gray-500">Saving...</p>}

    </div>
  );
}
