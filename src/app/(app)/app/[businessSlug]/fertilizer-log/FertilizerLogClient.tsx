"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
import { useFertilizerFilter, FertilizerFilterPanel } from "./FertilizerFilterPopover";
import { updateFertilizerLog, deleteFertilizerLog } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";

export type FertilizerRow = {
  id: string;
  date: string | null;
  plantSku: string | null;
  potSku: string | null;
  product: string | null;
  method: string | null;
  rate: string | null;
  unit: string | null;
  notes: string | null;
  nextEarliest: string | null;
  nextLatest: string | null;
};

export default function FertilizerLogClient({
  businessSlug,
  rows,
  hasRows,
}: {
  businessSlug: string;
  rows: FertilizerRow[];
  hasRows: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isOpen, setIsOpen, hasActiveFilters, filters, setFilters, apply, clear, cancel } =
    useFertilizerFilter();

  const selectedRow = rows.find((r) => r.id === selectedId) ?? null;
  const formatDate = (date: string | null) => (date ? date.slice(0, 10) : "—");

  async function handleSave(id: string, field: keyof Omit<FertilizerRow, "id" | "nextEarliest" | "nextLatest">, value: string) {
    const payload: Record<string, unknown> = {};
    if (field === "date") payload.date = value || null;
    else if (field === "plantSku") payload.plantSku = value || null;
    else if (field === "potSku") payload.potSku = value || null;
    else if (field === "product") payload.product = value || null;
    else if (field === "method") payload.method = value || null;
    else if (field === "rate") payload.rate = value || null;
    else if (field === "unit") payload.unit = value || null;
    else if (field === "notes") payload.notes = value || null;

    const res = await updateFertilizerLog(id, businessSlug, payload as Parameters<typeof updateFertilizerLog>[2]);
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    const res = await deleteFertilizerLog(id, businessSlug);
    if (res.ok) {
      setSelectedId(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <ModuleHeader
          title="Fertilizer Log"
          addHref={`/app/${businessSlug}/fertilizer-log/new`}
          onFilterClick={() => setIsOpen((prev) => !prev)}
          filterActive={hasActiveFilters}
          rightSlot={
            <FertilizerFilterPanel
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
            No fertilizer log entries yet.
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

          <div className="md:hidden space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                className="rounded-lg border border-gray-200 bg-white p-3 cursor-pointer active:bg-green-50"
              >
                <p className="text-sm font-medium">{row.date?.slice(0, 10) ?? "—"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {row.plantSku ?? "—"} · {row.product ?? "—"}
                </p>
                {row.method && <p className="text-xs text-gray-400 mt-0.5">{row.method}</p>}
              </div>
            ))}
          </div>


          <div className="hidden md:block overflow-x-auto">
            <div className="rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[1200px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                    <th className="sticky top-0 z-10 px-3 py-2">Date</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Plant SKU</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Pot SKU</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Product</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Method</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Rate</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Unit</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Notes</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Next Earliest</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Next Latest</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className="border-t border-gray-100 cursor-pointer hover:bg-green-50/40"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.date ?? ""} onSave={(v) => handleSave(row.id, "date", v)} type="date" />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.plantSku ?? ""} onSave={(v) => handleSave(row.id, "plantSku", v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.potSku ?? ""} onSave={(v) => handleSave(row.id, "potSku", v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.product ?? ""} onSave={(v) => handleSave(row.id, "product", v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.method ?? ""} onSave={(v) => handleSave(row.id, "method", v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.rate ?? ""} onSave={(v) => handleSave(row.id, "rate", v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.unit ?? ""} onSave={(v) => handleSave(row.id, "unit", v)} />
                      </td>
                      <td className="px-3 py-2">
                        <EditableCell value={row.notes ?? ""} onSave={(v) => handleSave(row.id, "notes", v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.nextEarliest)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.nextLatest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {hasRows && isPending && <p className="text-xs text-gray-500">Saving…</p>}

      <RowDetailDrawer
        isOpen={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={selectedRow ? `${selectedRow.date?.slice(0, 10) ?? "Entry"} — ${selectedRow.plantSku ?? "Entry"}` : ""}
        onDelete={() => selectedRow && handleDelete(selectedRow.id)}
        fields={
          selectedRow
            ? [
                { label: "Date", node: <EditableCell value={selectedRow.date ?? ""} onSave={(v) => handleSave(selectedRow.id, "date", v)} type="date" /> },
                { label: "Plant SKU", node: <EditableCell value={selectedRow.plantSku ?? ""} onSave={(v) => handleSave(selectedRow.id, "plantSku", v)} /> },
                { label: "Pot SKU", node: <EditableCell value={selectedRow.potSku ?? ""} onSave={(v) => handleSave(selectedRow.id, "potSku", v)} /> },
                { label: "Product", node: <EditableCell value={selectedRow.product ?? ""} onSave={(v) => handleSave(selectedRow.id, "product", v)} /> },
                { label: "Method", node: <EditableCell value={selectedRow.method ?? ""} onSave={(v) => handleSave(selectedRow.id, "method", v)} /> },
                { label: "Rate", node: <EditableCell value={selectedRow.rate ?? ""} onSave={(v) => handleSave(selectedRow.id, "rate", v)} /> },
                { label: "Unit", node: <EditableCell value={selectedRow.unit ?? ""} onSave={(v) => handleSave(selectedRow.id, "unit", v)} /> },
                { label: "Notes", node: <EditableCell value={selectedRow.notes ?? ""} onSave={(v) => handleSave(selectedRow.id, "notes", v)} /> },
                { label: "Next Earliest", node: <span className="text-gray-700">{formatDate(selectedRow.nextEarliest)}</span> },
                { label: "Next Latest", node: <span className="text-gray-700">{formatDate(selectedRow.nextLatest)}</span> },
              ]
            : []
        }
      />
    </div>
  );
}
