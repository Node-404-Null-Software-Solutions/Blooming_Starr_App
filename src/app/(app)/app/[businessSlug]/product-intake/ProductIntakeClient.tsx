"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import ModuleHeader from "../_components/ModuleHeader";
import { useProductIntakeFilter, ProductIntakeFilterPanel } from "./ProductIntakeFilterPopover";
import {
  updateProductIntake,
  deleteProductIntake,
  type ProductIntakeUpdate,
} from "@/lib/actions/data-entries";
import type { LookupRow } from "@/lib/actions/lookups";
import { EditableCell } from "@/components/data-table/EditableCell";
import { MasterDetailLayout } from "@/components/data-table/MasterDetailLayout";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";
import { formatAppDate } from "@/lib/date-format";
import ProductIntakeDetailEditForm from "./ProductIntakeDetailEditForm";

export type ProductRow = {
  id: string;
  date: string;
  dateSort: string;
  vendor: string;
  source: string;
  category: string;
  size: string;
  style: string;
  purchaseNumber: string;
  qty: number;
  sku: string;
  unitCost: number;
  totalCostCents: number;
  paymentMethod: string;
  cardLast4: string | null;
  invoiceNumber: string;
  notes: string;
};

type EditableProductField = keyof Omit<ProductRow, "id" | "dateSort" | "unitCost" | "sku">;

const dash = "-";

function isBlankDisplay(value: unknown) {
  if (value == null) return true;
  const text = String(value);
  return (
    text === "" ||
    text === dash ||
    text === "\u2014" ||
    text.includes("\u00e2") ||
    text.includes("\u00c3")
  );
}

function cleanDisplay(value: unknown) {
  return isBlankDisplay(value) ? "" : String(value);
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function displayValue(row: ProductRow, field: EditableProductField) {
  const value = row[field];
  if (field === "date") return formatAppDate(cleanDisplay(value), dash);
  if (field === "totalCostCents") return money(Number(value) || 0);
  return cleanDisplay(value) || dash;
}

export default function ProductIntakeClient({
  businessSlug,
  rows,
  lookups,
  showAdd,
}: {
  businessSlug: string;
  rows: ProductRow[];
  lookups: Record<string, LookupRow[]>;
  showAdd: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientRows, setClientRows] = useState(rows);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  const { isOpen, setIsOpen, hasActiveFilters, filters, setFilters, apply, clear, cancel } =
    useProductIntakeFilter();

  useEffect(() => {
    setClientRows(rows);
  }, [rows]);

  useEffect(() => {
    if (!selectedId) setDetailEditMode(false);
  }, [selectedId]);

  const filteredRows = useMemo(() => {
    return [...clientRows].sort((a, b) => {
      const aTime = Date.parse(a.dateSort);
      const bTime = Date.parse(b.dateSort);
      const aValue = Number.isNaN(aTime) ? 0 : aTime;
      const bValue = Number.isNaN(bTime) ? 0 : bTime;
      return bValue - aValue;
    });
  }, [clientRows]);

  const selectedRow = filteredRows.find((row) => row.id === selectedId) ?? null;
  const hasRows = clientRows.length > 0;
  const detailOpen = selectedId !== null && !editMode && !selectMode;

  function toggleSelectMode() {
    setSelectMode((value) => !value);
    setEditMode(false);
    setDetailEditMode(false);
    setSelectedId(null);
    setSelectedRows(new Set());
  }

  function toggleEditMode() {
    setEditMode((value) => !value);
    setSelectMode(false);
    setDetailEditMode(false);
    setSelectedId(null);
  }

  function closeDetail() {
    setDetailEditMode(false);
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
      if (current.size === filteredRows.length) return new Set();
      return new Set(filteredRows.map((row) => row.id));
    });
  }

  function handleRowClick(row: ProductRow) {
    if (editMode) return;
    if (selectMode) {
      toggleSelectedRow(row.id);
      return;
    }
    setDetailEditMode(false);
    setSelectedId(row.id);
  }

  function applyProductDetailUpdate(row: ProductRow, data: ProductIntakeUpdate) {
    const next = { ...row };
    if (data.date !== undefined) {
      next.date = data.date ?? dash;
      const dateTime = data.date ? Date.parse(data.date) : Number.NaN;
      next.dateSort =
        data.date && !Number.isNaN(dateTime)
          ? new Date(dateTime).toISOString()
          : "";
    }
    if (data.vendor !== undefined) next.vendor = data.vendor ?? "";
    if (data.source !== undefined) next.source = data.source ?? "";
    if (data.category !== undefined) next.category = data.category ?? "";
    if (data.size !== undefined) next.size = data.size ?? "";
    if (data.style !== undefined) next.style = data.style ?? "";
    if (data.purchaseNumber !== undefined)
      next.purchaseNumber = data.purchaseNumber ?? "";
    if (data.qty !== undefined) next.qty = data.qty;
    if (data.totalCostCents !== undefined)
      next.totalCostCents = data.totalCostCents;
    if (data.paymentMethod !== undefined)
      next.paymentMethod = data.paymentMethod ?? "";
    if (data.cardLast4 !== undefined) next.cardLast4 = data.cardLast4;
    if (data.invoiceNumber !== undefined)
      next.invoiceNumber = data.invoiceNumber ?? "";
    if (data.notes !== undefined) next.notes = data.notes ?? "";
    next.unitCost = next.qty > 0 ? next.totalCostCents / 100 / next.qty : 0;
    return next;
  }

  async function handleSave(id: string, field: EditableProductField, value: string) {
    const numVal = /^\d+$/.test(value) ? parseInt(value, 10) : undefined;
    const payload: Record<string, unknown> = {};
    if (field === "date") payload.date = value || null;
    else if (field === "vendor") payload.vendor = value || null;
    else if (field === "source") payload.source = value || null;
    else if (field === "category") payload.category = value || null;
    else if (field === "size") payload.size = value || null;
    else if (field === "style") payload.style = value || null;
    else if (field === "purchaseNumber") payload.purchaseNumber = value || null;
    else if (field === "qty" && numVal !== undefined) payload.qty = numVal;
    else if (field === "totalCostCents" && numVal !== undefined) payload.totalCostCents = numVal;
    else if (field === "paymentMethod") payload.paymentMethod = value || null;
    else if (field === "cardLast4") payload.cardLast4 = value || null;
    else if (field === "invoiceNumber") payload.invoiceNumber = value || null;
    else if (field === "notes") payload.notes = value || null;

    const res = await updateProductIntake(
      id,
      businessSlug,
      payload as Parameters<typeof updateProductIntake>[2]
    );
    if (res.ok) {
      setClientRows((current) =>
        current.map((row) =>
          row.id === id
            ? applyProductDetailUpdate(row, payload as ProductIntakeUpdate)
            : row
        )
      );
      startTransition(() => router.refresh());
    }
  }

  async function handleDetailSave(data: ProductIntakeUpdate) {
    if (!selectedRow) return { ok: false, error: "No row selected" };
    setDetailSaving(true);
    try {
      const res = await updateProductIntake(selectedRow.id, businessSlug, data);
      if (res.ok) {
        setClientRows((current) =>
          current.map((row) =>
            row.id === selectedRow.id ? applyProductDetailUpdate(row, data) : row
          )
        );
        setDetailEditMode(false);
        startTransition(() => router.refresh());
      }
      return res;
    } finally {
      setDetailSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    const res = await deleteProductIntake(id, businessSlug);
    if (res.ok) {
      closeDetail();
      startTransition(() => router.refresh());
    }
  }

  function renderCell(
    row: ProductRow,
    field: EditableProductField,
    type: "text" | "currency" | "number" | "date" = "text"
  ) {
    if (!editMode) return displayValue(row, field);

    return (
      <div onClick={(event) => event.stopPropagation()}>
        <EditableCell
          value={
            field === "totalCostCents"
              ? String(row.totalCostCents)
              : cleanDisplay(row[field])
          }
          onSave={(value) => handleSave(row.id, field, value)}
          type={type}
        />
      </div>
    );
  }

  function renderDetailEditable(
    row: ProductRow,
    field: EditableProductField,
    type: "text" | "currency" | "number" | "date" = "text"
  ) {
    const editableValue =
      field === "totalCostCents"
        ? String(row.totalCostCents)
        : field === "qty"
          ? String(row.qty)
          : cleanDisplay(row[field]);

    return (
      <>
        <span className="lg:hidden">{displayValue(row, field)}</span>
        <span className="hidden lg:block">
          <EditableCell
            value={editableValue}
            onSave={(value) => handleSave(row.id, field, value)}
            type={type}
          />
        </span>
      </>
    );
  }

  const headCell =
    "sticky top-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-800";
  const bodyCell =
    "border-b border-r border-gray-200 px-3 py-1.5 align-middle text-xs text-gray-700";

  return (
    <MasterDetailLayout
      isDetailOpen={detailOpen}
      className="min-h-[calc(100vh-3.5rem)] bg-white"
      detail={
        <RowDetailDrawer
          isOpen={detailOpen}
          onClose={closeDetail}
          title={selectedRow ? `${formatAppDate(selectedRow.date, "Entry")} - ${selectedRow.sku}` : ""}
          onDelete={() => selectedRow && handleDelete(selectedRow.id)}
          onEdit={() => setDetailEditMode(true)}
          isEditing={detailEditMode}
          editContent={
            selectedRow ? (
              <ProductIntakeDetailEditForm
                row={selectedRow}
                lookups={lookups}
                isSaving={detailSaving}
                onCancel={() => setDetailEditMode(false)}
                onSave={handleDetailSave}
              />
            ) : null
          }
          fields={
            selectedRow
              ? [
                  { label: "Date", node: renderDetailEditable(selectedRow, "date", "date") },
                  { label: "Vendor", node: renderDetailEditable(selectedRow, "vendor") },
                  { label: "Source", node: renderDetailEditable(selectedRow, "source") },
                  { label: "Category", node: renderDetailEditable(selectedRow, "category") },
                  { label: "Size", node: renderDetailEditable(selectedRow, "size") },
                  { label: "Style", node: renderDetailEditable(selectedRow, "style") },
                  { label: "Purchase #", node: renderDetailEditable(selectedRow, "purchaseNumber") },
                  { label: "Qty", node: renderDetailEditable(selectedRow, "qty", "number") },
                  { label: "SKU", node: <span className="font-mono text-gray-700">{selectedRow.sku}</span> },
                  { label: "Unit Cost", node: <span className="text-gray-700">${selectedRow.qty > 0 ? (selectedRow.totalCostCents / 100 / selectedRow.qty).toFixed(2) : "0.00"}</span> },
                  { label: "Total Cost", node: renderDetailEditable(selectedRow, "totalCostCents", "currency") },
                  { label: "Payment Method", node: renderDetailEditable(selectedRow, "paymentMethod") },
                  { label: "Card #", node: renderDetailEditable(selectedRow, "cardLast4") },
                  { label: "Invoice #", node: renderDetailEditable(selectedRow, "invoiceNumber") },
                  { label: "Notes", node: renderDetailEditable(selectedRow, "notes") },
                ]
              : []
          }
        />
      }
    >
      <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <div className="relative">
        <ModuleHeader
          title="Product Intake"
          addHref={showAdd ? `/app/${businessSlug}/product-intake/new` : undefined}
          onFilterClick={() => setIsOpen((prev) => !prev)}
          filterActive={hasActiveFilters}
          selectMode={selectMode}
          editMode={editMode}
          onSelectClick={toggleSelectMode}
          onEditClick={toggleEditMode}
          rightSlot={
            <ProductIntakeFilterPanel
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
        <div className="m-4 rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          <div className="text-base font-semibold text-gray-900">
            No product intake records yet.
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
          {selectMode ? (
            <div className="flex h-10 items-center justify-center border-b border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-700 sm:justify-start sm:text-left">
              {selectedRows.size} row{selectedRows.size === 1 ? "" : "s"} selected
            </div>
          ) : null}

          {editMode ? (
            <div className="flex h-10 items-center justify-center border-b border-green-200 bg-green-50 px-4 text-center text-sm text-gray-700 sm:justify-start sm:text-left">
              Edit mode
            </div>
          ) : null}

          <div className="space-y-2 p-3 md:hidden">
            {filteredRows.map((row) => (
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
                className={`cursor-pointer rounded-md border p-3 text-center active:bg-green-50 ${
                  selectedRows.has(row.id) || selectedId === row.id
                    ? "border-green-400 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="relative min-h-5 text-center">
                  {selectMode ? (
                    <span className="absolute left-0 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm border border-gray-300 bg-white">
                      {selectedRows.has(row.id) ? (
                        <Check className="h-4 w-4 text-[#08bd12]" />
                      ) : null}
                    </span>
                  ) : null}
                  <div className="mx-auto min-w-0 max-w-full px-7 break-words [overflow-wrap:anywhere]">
                    <p className="text-sm font-medium">{formatAppDate(row.date, dash)}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {row.sku} - {cleanDisplay(row.vendor) || dash} - qty {row.qty}
                    </p>
                    {cleanDisplay(row.category) ? (
                      <p className="mt-0.5 text-xs text-gray-400">{cleanDisplay(row.category)}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1840px] border-collapse bg-white">
              <thead>
                <tr>
                  {selectMode ? (
                    <th className={`${headCell} w-12 text-center`}>
                      <button
                        type="button"
                        onClick={toggleAllRows}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-gray-300 bg-white"
                        aria-label="Select all visible rows"
                        aria-pressed={filteredRows.length > 0 && selectedRows.size === filteredRows.length}
                      >
                        {filteredRows.length > 0 && selectedRows.size === filteredRows.length ? (
                          <Check className="h-4 w-4 text-[#08bd12]" />
                        ) : null}
                      </button>
                    </th>
                  ) : null}
                  <th className={`${headCell} w-24`}>Date</th>
                  <th className={`${headCell} w-36`}>Vendor</th>
                  <th className={`${headCell} w-36`}>Source</th>
                  <th className={`${headCell} w-36`}>Category</th>
                  <th className={`${headCell} w-24`}>Size</th>
                  <th className={`${headCell} w-36`}>Style</th>
                  <th className={`${headCell} w-24`}>Purchase #</th>
                  <th className={`${headCell} w-16`}>Qty</th>
                  <th className={`${headCell} w-40`}>SKU</th>
                  <th className={`${headCell} w-24`}>Unit Cost</th>
                  <th className={`${headCell} w-24`}>Total Cost</th>
                  <th className={`${headCell} w-36`}>Payment Method</th>
                  <th className={`${headCell} w-20`}>Card #</th>
                  <th className={`${headCell} w-28`}>Invoice #</th>
                  <th className={`${headCell} w-56`}>Associated Product / Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const unitCostDollars = row.qty > 0 ? row.totalCostCents / 100 / row.qty : 0;
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
                        editMode ? "" : "cursor-pointer hover:bg-green-50/40"
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
                            {rowSelected ? (
                              <Check className="h-4 w-4 text-[#08bd12]" />
                            ) : null}
                          </button>
                        </td>
                      ) : null}
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "date", "date")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "vendor")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "source")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "category")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "size")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "style")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "purchaseNumber")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "qty", "number")}</td>
                      <td className={`${bodyCell} whitespace-nowrap font-mono`}>{row.sku}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>${unitCostDollars.toFixed(2)}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "totalCostCents", "currency")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "paymentMethod")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "cardLast4")}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{renderCell(row, "invoiceNumber")}</td>
                      <td className={`${bodyCell} max-w-56 truncate`} title={cleanDisplay(row.notes)}>
                        {renderCell(row, "notes")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasRows && isPending ? <p className="px-4 text-center text-xs text-gray-500 sm:text-left">Saving...</p> : null}

      </div>
    </MasterDetailLayout>
  );
}
