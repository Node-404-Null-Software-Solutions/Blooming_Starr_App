"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
import { useTransplantFilter, TransplantFilterPanel } from "./TransplantFilterPopover";
import { updateTransplantLog, deleteTransplantLog } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";

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
  const { isOpen, setIsOpen, hasActiveFilters, filters, setFilters, apply, clear, cancel } =
    useTransplantFilter();

  const selectedRow = rows.find((r) => r.id === selectedId) ?? null;

  async function handleSave(id: string, field: keyof Omit<TransplantRow, "id">, value: string) {
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

  return (
    <div className="space-y-6">
      <div className="relative">
        <ModuleHeader
          title="Transplant Log"
          addHref={`/app/${businessSlug}/transplant-log/new`}
          onFilterClick={() => setIsOpen((prev) => !prev)}
          filterActive={hasActiveFilters}
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
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                className="rounded-lg border border-gray-200 bg-white p-3 cursor-pointer active:bg-green-50"
              >
                <p className="text-sm font-medium">{row.date?.slice(0, 10) ?? "—"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {row.originalSku ?? "—"} → {row.divisionSku ?? "—"}
                </p>
                {row.action && <p className="text-xs text-gray-400 mt-0.5">{row.action}</p>}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <div className="rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[1400px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
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
                      onClick={() => setSelectedId(row.id)}
                      className="border-t border-gray-100 cursor-pointer hover:bg-green-50/40"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.date ?? ""} onSave={(v) => handleSave(row.id, "date", v)} type="date" />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.originalSku ?? ""} onSave={(v) => handleSave(row.id, "originalSku", v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.action ?? ""} onSave={(v) => handleSave(row.id, "action", v)} type={actionOptions.length ? "select" : "text"} options={actionOptions} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.media ?? ""} onSave={(v) => handleSave(row.id, "media", v)} type={mediaOptions.length ? "select" : "text"} options={mediaOptions} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.fromPot ?? ""} onSave={(v) => handleSave(row.id, "fromPot", v)} type={potSizeOptions.length ? "select" : "text"} options={potSizeOptions} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.toPot ?? ""} onSave={(v) => handleSave(row.id, "toPot", v)} type={potSizeOptions.length ? "select" : "text"} options={potSizeOptions} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.idCode ?? ""} onSave={(v) => handleSave(row.id, "idCode", v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.divisionSku ?? ""} onSave={(v) => handleSave(row.id, "divisionSku", v)} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell
                          value={row.costCents != null ? String(row.costCents) : ""}
                          onSave={(v) => handleSave(row.id, "costCents", v)}
                          type="currency"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EditableCell value={row.potColor ?? ""} onSave={(v) => handleSave(row.id, "potColor", v)} type={potColorOptions.length ? "select" : "text"} options={potColorOptions} />
                      </td>
                      <td className="px-3 py-2">
                        <EditableCell value={row.notes ?? ""} onSave={(v) => handleSave(row.id, "notes", v)} />
                      </td>
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
        title={selectedRow ? `${selectedRow.date?.slice(0, 10) ?? "Entry"} — ${selectedRow.originalSku ?? "Entry"}` : ""}
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
