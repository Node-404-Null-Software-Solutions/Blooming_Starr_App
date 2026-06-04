"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import ModuleHeader from "../_components/ModuleHeader";
import { useTransplantFilter, TransplantFilterPanel } from "./TransplantFilterPopover";
import { updateTransplantLog, deleteTransplantLog } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";
import { formatAppDate } from "@/lib/date-format";

export type TransplantRow = {
  id: string;
  date: string | null;
  originalSku: string | null;
  action: string | null;
  media: string | null;
  fromPot: string | null;
  toPot: string | null;
  idCode: string | null;
  divisionSku: string | null;
  costCents: number | null;
  potColor: string | null;
  notes: string | null;
};

type EditableTransplantField = keyof Omit<TransplantRow, "id">;

function displayValue(row: TransplantRow, field: EditableTransplantField) {
  const value = row[field];
  if (field === "date") return formatAppDate(value as string | null, "-");
  if (field === "costCents") {
    return typeof value === "number" ? `$${(value / 100).toFixed(2)}` : "-";
  }
  return value ? String(value) : "-";
}

export default function TransplantLogClient({
  businessSlug,
  rows,
  hasRows,
  actionOptions = [],
  mediaOptions = [],
  potSizeOptions = [],
  potColorOptions = [],
}: {
  businessSlug: string;
  rows: TransplantRow[];
  hasRows: boolean;
  actionOptions?: string[];
  mediaOptions?: string[];
  potSizeOptions?: string[];
  potColorOptions?: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  const { isOpen, setIsOpen, hasActiveFilters, filters, setFilters, apply, clear, cancel } =
    useTransplantFilter();

  const selectedRow = rows.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectMode) setSelectedRows(new Set());
  }, [selectMode]);

  function toggleSelectMode() {
    setSelectMode((value) => !value);
    setEditMode(false);
    setSelectedId(null);
  }

  function toggleEditMode() {
    setEditMode((value) => !value);
    setSelectMode(false);
    setSelectedId(null);
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

  function handleRowClick(row: TransplantRow) {
    if (editMode) return;
    if (selectMode) {
      toggleSelectedRow(row.id);
      return;
    }
    setSelectedId(row.id);
  }

  async function handleSave(id: string, field: EditableTransplantField, value: string) {
    const numVal = /^\d+$/.test(value) ? parseInt(value, 10) : undefined;
    const payload: Record<string, unknown> = {};
    if (field === "date") payload.date = value || null;
    else if (field === "originalSku") payload.originalSku = value || null;
    else if (field === "action") payload.action = value || null;
    else if (field === "media") payload.media = value || null;
    else if (field === "fromPot") payload.fromPot = value || null;
    else if (field === "toPot") payload.toPot = value || null;
    else if (field === "idCode") payload.idCode = value || null;
    else if (field === "divisionSku") payload.divisionSku = value || null;
    else if (field === "costCents" && numVal !== undefined) payload.costCents = numVal;
    else if (field === "potColor") payload.potColor = value || null;
    else if (field === "notes") payload.notes = value || null;

    const res = await updateTransplantLog(id, businessSlug, payload as Parameters<typeof updateTransplantLog>[2]);
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    const res = await deleteTransplantLog(id, businessSlug);
    if (res.ok) {
      setSelectedId(null);
      startTransition(() => router.refresh());
    }
  }

  function renderCell(
    row: TransplantRow,
    field: EditableTransplantField,
    type: "text" | "currency" | "number" | "date" | "select" = "text",
    options?: readonly string[]
  ) {
    if (!editMode) return displayValue(row, field);

    return (
      <div onClick={(event) => event.stopPropagation()}>
        <EditableCell
          value={row[field] != null ? String(row[field]) : ""}
          onSave={(value) => handleSave(row.id, field, value)}
          type={type}
          options={options}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <ModuleHeader
          title="Transplant Log"
          addHref={`/app/${businessSlug}/transplant-log/new`}
          onFilterClick={() => setIsOpen((prev) => !prev)}
          filterActive={hasActiveFilters}
          selectMode={selectMode}
          editMode={editMode}
          onSelectClick={toggleSelectMode}
          onEditClick={toggleEditMode}
          rightSlot={
            <TransplantFilterPanel
              isOpen={isOpen}
              filters={filters}
              setFilters={setFilters}
              onApply={apply}
              onClear={clear}
              onCancel={cancel}
            />
          }
        />
      </div>
      {!hasRows ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          <div className="text-base font-semibold text-gray-900">
            No transplant logs yet.
          </div>
          <p className="mt-2">
            Import your Inventory Trackers workbook to populate this list.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Link
              href={`/app/${businessSlug}/settings/import`}
              className="inline-flex items-center rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Import
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                onClick={() => handleRowClick(row)}
                className={`cursor-pointer rounded-lg border p-3 active:bg-green-50 ${
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
                      {row.originalSku ?? "-"} - {row.divisionSku ?? "-"}
                    </p>
                    {row.action && <p className="mt-0.5 text-xs text-gray-400">{row.action}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <div className="rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[1400px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                    {selectMode ? (
                      <th className="sticky top-0 z-10 w-12 px-3 py-2 text-center">
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
                    <th className="sticky top-0 z-10 px-3 py-2">Date</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Original SKU</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Action</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Media</th>
                    <th className="sticky top-0 z-10 px-3 py-2">From Pot</th>
                    <th className="sticky top-0 z-10 px-3 py-2">To Pot</th>
                    <th className="sticky top-0 z-10 px-3 py-2">ID</th>
                    <th className="sticky top-0 z-10 px-3 py-2">New SKU</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Cost Per</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Pot Color</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className={`border-t border-gray-100 ${
                        editMode ? "" : "cursor-pointer hover:bg-green-50/40"
                      } ${selectedRows.has(row.id) ? "bg-green-50" : ""}`}
                    >
                      {selectMode ? (
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelectedRow(row.id);
                            }}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-gray-300 bg-white"
                            aria-label={`Select ${row.originalSku ?? row.id}`}
                            aria-pressed={selectedRows.has(row.id)}
                          >
                            {selectedRows.has(row.id) ? <Check className="h-4 w-4 text-[#08bd12]" /> : null}
                          </button>
                        </td>
                      ) : null}
                      <td className="px-3 py-2 whitespace-nowrap">{renderCell(row, "date", "date")}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{renderCell(row, "originalSku")}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {renderCell(row, "action", actionOptions.length ? "select" : "text", actionOptions)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {renderCell(row, "media", mediaOptions.length ? "select" : "text", mediaOptions)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {renderCell(row, "fromPot", potSizeOptions.length ? "select" : "text", potSizeOptions)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {renderCell(row, "toPot", potSizeOptions.length ? "select" : "text", potSizeOptions)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{renderCell(row, "idCode")}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{renderCell(row, "divisionSku")}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{renderCell(row, "costCents", "currency")}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {renderCell(row, "potColor", potColorOptions.length ? "select" : "text", potColorOptions)}
                      </td>
                      <td className="px-3 py-2">{renderCell(row, "notes")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectMode ? (
        <p className="text-xs text-gray-500">
          {selectedRows.size} row{selectedRows.size === 1 ? "" : "s"} selected
        </p>
      ) : null}

      {hasRows && isPending && <p className="text-xs text-gray-500">Saving...</p>}

      <RowDetailDrawer
        isOpen={selectedId !== null && !editMode && !selectMode}
        onClose={() => setSelectedId(null)}
        title={selectedRow ? `${formatAppDate(selectedRow.date, "Entry")} - ${selectedRow.originalSku ?? "Entry"}` : ""}
        onDelete={() => selectedRow && handleDelete(selectedRow.id)}
        fields={
          selectedRow
            ? [
                { label: "Date", node: <EditableCell value={selectedRow.date ?? ""} onSave={(v) => handleSave(selectedRow.id, "date", v)} type="date" /> },
                { label: "Original SKU", node: <EditableCell value={selectedRow.originalSku ?? ""} onSave={(v) => handleSave(selectedRow.id, "originalSku", v)} /> },
                { label: "Action", node: <EditableCell value={selectedRow.action ?? ""} onSave={(v) => handleSave(selectedRow.id, "action", v)} type={actionOptions.length ? "select" : "text"} options={actionOptions} /> },
                { label: "Media", node: <EditableCell value={selectedRow.media ?? ""} onSave={(v) => handleSave(selectedRow.id, "media", v)} type={mediaOptions.length ? "select" : "text"} options={mediaOptions} /> },
                { label: "From Pot", node: <EditableCell value={selectedRow.fromPot ?? ""} onSave={(v) => handleSave(selectedRow.id, "fromPot", v)} type={potSizeOptions.length ? "select" : "text"} options={potSizeOptions} /> },
                { label: "To Pot", node: <EditableCell value={selectedRow.toPot ?? ""} onSave={(v) => handleSave(selectedRow.id, "toPot", v)} type={potSizeOptions.length ? "select" : "text"} options={potSizeOptions} /> },
                { label: "ID", node: <EditableCell value={selectedRow.idCode ?? ""} onSave={(v) => handleSave(selectedRow.id, "idCode", v)} /> },
                { label: "New SKU", node: <EditableCell value={selectedRow.divisionSku ?? ""} onSave={(v) => handleSave(selectedRow.id, "divisionSku", v)} /> },
                { label: "Cost Per", node: <EditableCell value={selectedRow.costCents != null ? String(selectedRow.costCents) : ""} onSave={(v) => handleSave(selectedRow.id, "costCents", v)} type="currency" /> },
                { label: "Pot Color", node: <EditableCell value={selectedRow.potColor ?? ""} onSave={(v) => handleSave(selectedRow.id, "potColor", v)} type={potColorOptions.length ? "select" : "text"} options={potColorOptions} /> },
                { label: "Notes", node: <EditableCell value={selectedRow.notes ?? ""} onSave={(v) => handleSave(selectedRow.id, "notes", v)} /> },
              ]
            : []
        }
      />
    </div>
  );
}
