"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { updateSalesEntry, deleteSalesEntry } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";
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

type EditableSalesField =
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
  businessSlug,
  initialRows,
  selectMode = false,
  editMode = false,
}: {
  businessSlug: string;
  initialRows: SalesRow[];
  selectMode?: boolean;
  editMode?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  const selectedRow = initialRows.find((r) => r.id === selectedId) ?? null;

  async function handleSave(id: string, field: EditableSalesField, value: string) {
    const numVal = /^\d+$/.test(value) ? parseInt(value, 10) : undefined;
    const payload: Record<string, unknown> = {};
    if (field === "date") payload.date = value || null;
    else if (field === "sku") payload.sku = value;
    else if (field === "itemName") payload.itemName = value || null;
    else if (field === "qty" && numVal !== undefined) payload.qty = numVal;
    else if (field === "salePriceCents" && numVal !== undefined) payload.salePriceCents = numVal;
    else if (field === "paymentMethod") payload.paymentMethod = value || null;
    else if (field === "cardLast4") payload.cardLast4 = value || null;
    else if (field === "channel") payload.channel = value || null;
    else if (field === "costCents" && numVal !== undefined) payload.costCents = numVal;
    else if (field === "notes") payload.notes = value || null;

    const res = await updateSalesEntry(id, businessSlug, payload as Parameters<typeof updateSalesEntry>[2]);
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    const res = await deleteSalesEntry(id, businessSlug);
    if (res.ok) {
      setSelectedId(null);
      startTransition(() => router.refresh());
    }
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
    setSelectedId(row.id);
  }

  function renderCell(row: SalesRow, field: EditableSalesField, type: "text" | "currency" | "number" | "date" = "text") {
    if (!editMode) return displayValue(row, field);

    return (
      <div onClick={(event) => event.stopPropagation()}>
        <EditableCell
          value={fieldValue(row, field)}
          onSave={(value) => handleSave(row.id, field, value)}
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
            className={`cursor-pointer rounded-md border p-3 active:bg-green-50 ${
              selectedRows.has(row.id) ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"
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
              return (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  className={`h-9 ${
                    modeActive ? "" : "cursor-pointer hover:bg-green-50/50"
                  } ${rowSelected ? "bg-green-50" : ""}`}
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

      <RowDetailDrawer
        isOpen={selectedId !== null && !editMode && !selectMode}
        onClose={() => setSelectedId(null)}
        title={selectedRow ? `${formatAppDate(selectedRow.date, "Entry")} - ${selectedRow.sku}` : ""}
        onDelete={() => selectedRow && handleDelete(selectedRow.id)}
        fields={
          selectedRow
            ? [
                { label: "Date", node: <EditableCell value={selectedRow.date?.slice(0, 10) ?? ""} onSave={(v) => handleSave(selectedRow.id, "date", v)} type="date" /> },
                { label: "SKU", node: <EditableCell value={selectedRow.sku} onSave={(v) => handleSave(selectedRow.id, "sku", v)} /> },
                { label: "Item Name", node: <EditableCell value={selectedRow.itemName ?? ""} onSave={(v) => handleSave(selectedRow.id, "itemName", v)} /> },
                { label: "Sale Channel", node: <EditableCell value={selectedRow.channel ?? ""} onSave={(v) => handleSave(selectedRow.id, "channel", v)} /> },
                { label: "Qty", node: <EditableCell value={String(selectedRow.qty)} onSave={(v) => handleSave(selectedRow.id, "qty", v)} type="number" /> },
                { label: "Sale Price", node: <EditableCell value={String(selectedRow.salePriceCents)} onSave={(v) => handleSave(selectedRow.id, "salePriceCents", v)} type="currency" /> },
                { label: "Total Sale", node: <span className="text-gray-700">{money(selectedRow.totalSaleCents ?? 0)}</span> },
                { label: "Payment Method", node: <EditableCell value={selectedRow.paymentMethod ?? ""} onSave={(v) => handleSave(selectedRow.id, "paymentMethod", v)} /> },
                { label: "Card #", node: <EditableCell value={selectedRow.cardLast4 ?? ""} onSave={(v) => handleSave(selectedRow.id, "cardLast4", v)} /> },
                { label: "Cost", node: <EditableCell value={String(selectedRow.costCents)} onSave={(v) => handleSave(selectedRow.id, "costCents", v)} type="currency" /> },
                { label: "Profit", node: <span className="text-gray-700">{money(selectedRow.profitCents ?? 0)}</span> },
                { label: "Margin %", node: <span className="text-gray-700">{margin(selectedRow.marginPct)}</span> },
                { label: "Notes", node: <EditableCell value={selectedRow.notes ?? ""} onSave={(v) => handleSave(selectedRow.id, "notes", v)} /> },
              ]
            : []
        }
      />
    </div>
  );
}
