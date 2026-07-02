"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
import { useTreatmentFilter, TreatmentFilterPanel } from "./TreatmentFilterPopover";
import { updateTreatmentTracking, deleteTreatmentTracking } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";
import { formatAppDate } from "@/lib/date-format";

export type TreatmentRow = {
  id: string;
  date: string | null;
  sku: string;
  target: string | null;
  product: string | null;
  activeIngredient: string | null;
  epaNumber: string | null;
  rate: string | null;
  potSize: string | null;
  method: string | null;
  initials: string | null;
  nextEarliest: string | null;
  nextLatest: string | null;
};

export default function TreatmentTrackingClient({
  businessSlug,
  rows,
  hasRows,
}: {
  businessSlug: string;
  rows: TreatmentRow[];
  hasRows: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isOpen, setIsOpen, hasActiveFilters, filters, setFilters, apply, clear, cancel } =
    useTreatmentFilter();

  const selectedRow = rows.find((r) => r.id === selectedId) ?? null;
  const formatDate = (date: string | null) => formatAppDate(date, "—");

  async function handleSave(id: string, field: keyof Omit<TreatmentRow, "id" | "nextEarliest" | "nextLatest">, value: string) {
    const payload: Record<string, unknown> = {};
    if (field === "date") payload.date = value || null;
    else if (field === "sku") payload.sku = value;
    else if (field === "target") payload.target = value || null;
    else if (field === "product") payload.product = value || null;
    else if (field === "activeIngredient") payload.activeIngredient = value || null;
    else if (field === "epaNumber") payload.epaNumber = value || null;
    else if (field === "rate") payload.rate = value || null;
    else if (field === "potSize") payload.potSize = value || null;
    else if (field === "method") payload.method = value || null;
    else if (field === "initials") payload.initials = value || null;

    const res = await updateTreatmentTracking(id, businessSlug, payload as Parameters<typeof updateTreatmentTracking>[2]);
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    const res = await deleteTreatmentTracking(id, businessSlug);
    if (res.ok) {
      setSelectedId(null);
      startTransition(() => router.refresh());
    }
  }

  const headCell =
    "sticky top-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-800";
  const bodyCell =
    "border-b border-r border-gray-200 px-3 py-1.5 align-middle text-xs text-gray-700";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <div className="relative">
        <ModuleHeader
          title="Treatment Tracking"
          addHref={`/app/${businessSlug}/treatment-tracking/new`}
          onFilterClick={() => setIsOpen((prev) => !prev)}
          filterActive={hasActiveFilters}
          rightSlot={
            <TreatmentFilterPanel
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
            No treatment tracking entries yet.
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

          <div className="space-y-2 p-3 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                className="rounded-lg border border-gray-200 bg-white p-3 cursor-pointer active:bg-green-50"
              >
                <p className="text-sm font-medium">{formatAppDate(row.date, "—")}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {row.sku} · {row.target ?? "—"} · {row.product ?? "—"}
                </p>
                {row.method && <p className="text-xs text-gray-400 mt-0.5">{row.method}</p>}
              </div>
            ))}
          </div>


          <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1500px] border-collapse bg-white">
                <thead>
                  <tr>
                    <th className={headCell}>Date</th>
                    <th className={headCell}>SKU</th>
                    <th className={headCell}>Target</th>
                    <th className={headCell}>Product</th>
                    <th className={headCell}>Active Ingredient</th>
                    <th className={headCell}>EPA #</th>
                    <th className={headCell}>Rate</th>
                    <th className={headCell}>Pot Size</th>
                    <th className={headCell}>Method</th>
                    <th className={headCell}>Initials</th>
                    <th className={headCell}>Next Earliest Application</th>
                    <th className={headCell}>Next Latest Application</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className="h-9 cursor-pointer hover:bg-green-50/50"
                    >
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.date ?? ""} onSave={(v) => handleSave(row.id, "date", v)} type="date" />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.sku} onSave={(v) => handleSave(row.id, "sku", v)} />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.target ?? ""} onSave={(v) => handleSave(row.id, "target", v)} />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.product ?? ""} onSave={(v) => handleSave(row.id, "product", v)} />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.activeIngredient ?? ""} onSave={(v) => handleSave(row.id, "activeIngredient", v)} />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.epaNumber ?? ""} onSave={(v) => handleSave(row.id, "epaNumber", v)} />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.rate ?? ""} onSave={(v) => handleSave(row.id, "rate", v)} />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.potSize ?? ""} onSave={(v) => handleSave(row.id, "potSize", v)} />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.method ?? ""} onSave={(v) => handleSave(row.id, "method", v)} />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>
                        <EditableCell value={row.initials ?? ""} onSave={(v) => handleSave(row.id, "initials", v)} />
                      </td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{formatDate(row.nextEarliest)}</td>
                      <td className={`${bodyCell} whitespace-nowrap`}>{formatDate(row.nextLatest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </>
      )}

      {hasRows && isPending && <p className="text-xs text-gray-500">Saving…</p>}

      <RowDetailDrawer
        isOpen={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={selectedRow ? `${formatAppDate(selectedRow.date, "Entry")} — ${selectedRow.sku}` : ""}
        onDelete={() => selectedRow && handleDelete(selectedRow.id)}
        fields={
          selectedRow
            ? [
                { label: "Date", node: <EditableCell value={selectedRow.date ?? ""} onSave={(v) => handleSave(selectedRow.id, "date", v)} type="date" /> },
                { label: "SKU", node: <EditableCell value={selectedRow.sku} onSave={(v) => handleSave(selectedRow.id, "sku", v)} /> },
                { label: "Target", node: <EditableCell value={selectedRow.target ?? ""} onSave={(v) => handleSave(selectedRow.id, "target", v)} /> },
                { label: "Product", node: <EditableCell value={selectedRow.product ?? ""} onSave={(v) => handleSave(selectedRow.id, "product", v)} /> },
                { label: "Active Ingredient", node: <EditableCell value={selectedRow.activeIngredient ?? ""} onSave={(v) => handleSave(selectedRow.id, "activeIngredient", v)} /> },
                { label: "EPA #", node: <EditableCell value={selectedRow.epaNumber ?? ""} onSave={(v) => handleSave(selectedRow.id, "epaNumber", v)} /> },
                { label: "Rate", node: <EditableCell value={selectedRow.rate ?? ""} onSave={(v) => handleSave(selectedRow.id, "rate", v)} /> },
                { label: "Pot Size", node: <EditableCell value={selectedRow.potSize ?? ""} onSave={(v) => handleSave(selectedRow.id, "potSize", v)} /> },
                { label: "Method", node: <EditableCell value={selectedRow.method ?? ""} onSave={(v) => handleSave(selectedRow.id, "method", v)} /> },
                { label: "Initials", node: <EditableCell value={selectedRow.initials ?? ""} onSave={(v) => handleSave(selectedRow.id, "initials", v)} /> },
                { label: "Next Earliest", node: <span className="text-gray-700">{formatDate(selectedRow.nextEarliest)}</span> },
                { label: "Next Latest", node: <span className="text-gray-700">{formatDate(selectedRow.nextLatest)}</span> },
              ]
            : []
        }
      />
    </div>
  );
}
