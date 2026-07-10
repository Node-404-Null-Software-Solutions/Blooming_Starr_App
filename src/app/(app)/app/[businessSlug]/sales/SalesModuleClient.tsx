"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SalesFilterPopover,
  SalesFilterPanel,
} from "./SalesFilterPopover";
import SalesDataTable, { type EditableSalesField, type SalesRow } from "./SalesDataTable";
import ModuleHeader from "../_components/ModuleHeader";
import { updateSalesEntry, deleteSalesEntry } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";
import { MasterDetailLayout } from "@/components/data-table/MasterDetailLayout";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";
import { formatAppDate } from "@/lib/date-format";

type SalesModuleClientProps = {
  businessSlug: string;
  initialRows: SalesRow[];
  hasRows: boolean;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function margin(value: number | null) {
  return value == null ? "" : `${value.toFixed(2)}%`;
}

export default function SalesModuleClient({
  businessSlug,
  initialRows,
  hasRows,
}: SalesModuleClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectMode, setSelectMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const {
    isOpen,
    setIsOpen,
    hasActiveFilters,
    filters,
    setFilters,
    handleApply,
    handleClear,
    handleCancel,
  } = SalesFilterPopover();
  const selectedRow = initialRows.find((row) => row.id === selectedId) ?? null;
  const detailOpen = selectedId !== null && !editMode && !selectMode;

  function toggleSelectMode() {
    setSelectMode((value) => !value);
    setEditMode(false);
  }

  function toggleEditMode() {
    setEditMode((value) => !value);
    setSelectMode(false);
  }

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

  return (
    <MasterDetailLayout
      isDetailOpen={detailOpen}
      className="min-h-[calc(100vh-3.5rem)] bg-white"
      detail={
        <RowDetailDrawer
          isOpen={detailOpen}
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
      }
    >
      <div className="min-h-[calc(100vh-3.5rem)] bg-white">
        <ModuleHeader
          title="Sales"
          addHref={`/app/${businessSlug}/sales/new`}
          onFilterClick={() => setIsOpen((prev) => !prev)}
          filterActive={hasActiveFilters}
          onSelectClick={toggleSelectMode}
          onEditClick={toggleEditMode}
          selectMode={selectMode}
          editMode={editMode}
          rightSlot={
            <SalesFilterPanel
              isOpen={isOpen}
              filters={filters}
              setFilters={setFilters}
              onApply={handleApply}
              onClear={handleClear}
              onCancel={handleCancel}
            />
          }
        />
        {!hasRows ? (
          <div className="m-4 rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
            <div className="text-base font-semibold text-gray-900">
              No sales entries yet.
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
          <SalesDataTable
            initialRows={initialRows}
            selectedId={selectedId}
            onSelectedIdChange={setSelectedId}
            onSave={handleSave}
            isPending={isPending}
            selectMode={selectMode}
            editMode={editMode}
          />
        )}
      </div>
    </MasterDetailLayout>
  );
}
