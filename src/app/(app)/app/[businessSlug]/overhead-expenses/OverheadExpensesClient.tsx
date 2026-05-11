"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
import { useOverheadFilter, OverheadFilterPanel } from "./OverheadFilterPopover";
import { updateOverheadExpense, deleteOverheadExpense } from "@/lib/actions/data-entries";
import { centsToUsdFixed } from "@/lib/formulas";
import { EditableCell } from "@/components/data-table/EditableCell";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";

export type OverheadRow = {
  id: string;
  date: string | null;
  vendor: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  qty: number;
  subTotalCents: number | null;
  discountCents: number | null;
  unitCostCents: number | null;
  totalCents: number | null;
  paymentMethod: string | null;
  cardLast4: string | null;
  invoiceNumber: string | null;
  notes: string | null;
};

export default function OverheadExpensesClient({
  businessSlug,
  rows,
  hasRows,
}: {
  businessSlug: string;
  rows: OverheadRow[];
  hasRows: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isOpen, setIsOpen, hasActiveFilters, filters, setFilters, apply, clear, cancel } =
    useOverheadFilter();

  const selectedRow = rows.find((r) => r.id === selectedId) ?? null;

  async function handleSave(id: string, field: keyof Omit<OverheadRow, "id" | "unitCostCents" | "totalCents">, value: string) {
    const numVal = /^\d+$/.test(value) ? parseInt(value, 10) : undefined;
    const payload: Record<string, unknown> = {};
    if (field === "date") payload.date = value || null;
    else if (field === "vendor") payload.vendor = value || null;
    else if (field === "brand") payload.brand = value || null;
    else if (field === "category") payload.category = value || null;
    else if (field === "description") payload.description = value || null;
    else if (field === "qty" && numVal !== undefined) payload.qty = numVal;
    else if (field === "subTotalCents" && numVal !== undefined) payload.subTotalCents = numVal;
    else if (field === "discountCents" && numVal !== undefined) payload.discountCents = numVal;
    else if (field === "paymentMethod") payload.paymentMethod = value || null;
    else if (field === "invoiceNumber") payload.invoiceNumber = value || null;
    else if (field === "notes") payload.notes = value || null;

    const res = await updateOverheadExpense(id, businessSlug, payload as Parameters<typeof updateOverheadExpense>[2]);
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    const res = await deleteOverheadExpense(id, businessSlug);
    if (res.ok) {
      setSelectedId(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <ModuleHeader
          title="Overhead Expenses"
          addHref={`/app/${businessSlug}/overhead-expenses/new`}
          onFilterClick={() => setIsOpen((prev) => !prev)}
          filterActive={hasActiveFilters}
          rightSlot={
            <OverheadFilterPanel
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
            No overhead expenses yet.
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
                <p className="text-sm font-medium">{row.date ? row.date.slice(0, 10) : "—"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {row.vendor ?? "—"} · {row.category ?? "—"} · {centsToUsdFixed(row.totalCents ?? 0)}
                </p>
                {row.description && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{row.description}</p>
                )}
              </div>
            ))}
          </div>


          <div className="hidden md:block overflow-x-auto">
            <div className="rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[1700px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                    <th className="sticky top-0 z-10 px-3 py-2">Date</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Vendor</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Brand</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Category</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Description</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Qty</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Subtotal</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Discount</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Unit Cost</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Actual Total</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Payment Method</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Card #</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Invoice #</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Notes/Project</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  {rows.map((row) => {
                    const actualTotal = row.totalCents ?? 0;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedId(row.id)}
                        className="border-t border-gray-100 cursor-pointer hover:bg-green-50/40"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.date ? row.date.slice(0, 10) : ""} onSave={(v) => handleSave(row.id, "date", v)} type="date" />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.vendor ?? ""} onSave={(v) => handleSave(row.id, "vendor", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.brand ?? ""} onSave={(v) => handleSave(row.id, "brand", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.category ?? ""} onSave={(v) => handleSave(row.id, "category", v)} />
                        </td>
                        <td className="px-3 py-2">
                          <EditableCell value={row.description ?? ""} onSave={(v) => handleSave(row.id, "description", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={String(row.qty)} onSave={(v) => handleSave(row.id, "qty", v)} type="number" />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell
                            value={row.subTotalCents != null ? String(row.subTotalCents) : ""}
                            onSave={(v) => handleSave(row.id, "subTotalCents", v)}
                            type="currency"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell
                            value={row.discountCents != null ? String(row.discountCents) : ""}
                            onSave={(v) => handleSave(row.id, "discountCents", v)}
                            type="currency"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {centsToUsdFixed(row.unitCostCents ?? 0)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {centsToUsdFixed(actualTotal)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.paymentMethod ?? ""} onSave={(v) => handleSave(row.id, "paymentMethod", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.cardLast4 ? `**** ${row.cardLast4}` : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.invoiceNumber ?? ""} onSave={(v) => handleSave(row.id, "invoiceNumber", v)} />
                        </td>
                        <td className="px-3 py-2">
                          <EditableCell value={row.notes ?? ""} onSave={(v) => handleSave(row.id, "notes", v)} />
                        </td>
                      </tr>
                    );
                  })}
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
        title={selectedRow ? `${selectedRow.date?.slice(0, 10) ?? "Entry"} — ${selectedRow.vendor ?? "Expense"}` : ""}
        onDelete={() => selectedRow && handleDelete(selectedRow.id)}
        fields={
          selectedRow
            ? [
                { label: "Date", node: <EditableCell value={selectedRow.date ? selectedRow.date.slice(0, 10) : ""} onSave={(v) => handleSave(selectedRow.id, "date", v)} type="date" /> },
                { label: "Vendor", node: <EditableCell value={selectedRow.vendor ?? ""} onSave={(v) => handleSave(selectedRow.id, "vendor", v)} /> },
                { label: "Brand", node: <EditableCell value={selectedRow.brand ?? ""} onSave={(v) => handleSave(selectedRow.id, "brand", v)} /> },
                { label: "Category", node: <EditableCell value={selectedRow.category ?? ""} onSave={(v) => handleSave(selectedRow.id, "category", v)} /> },
                { label: "Description", node: <EditableCell value={selectedRow.description ?? ""} onSave={(v) => handleSave(selectedRow.id, "description", v)} /> },
                { label: "Qty", node: <EditableCell value={String(selectedRow.qty)} onSave={(v) => handleSave(selectedRow.id, "qty", v)} type="number" /> },
                { label: "Subtotal", node: <EditableCell value={selectedRow.subTotalCents != null ? String(selectedRow.subTotalCents) : ""} onSave={(v) => handleSave(selectedRow.id, "subTotalCents", v)} type="currency" /> },
                { label: "Discount", node: <EditableCell value={selectedRow.discountCents != null ? String(selectedRow.discountCents) : ""} onSave={(v) => handleSave(selectedRow.id, "discountCents", v)} type="currency" /> },
                { label: "Unit Cost", node: <span className="text-gray-700">{centsToUsdFixed(selectedRow.unitCostCents ?? 0)}</span> },
                { label: "Actual Total", node: <span className="text-gray-700">{centsToUsdFixed(selectedRow.totalCents ?? 0)}</span> },
                { label: "Payment Method", node: <EditableCell value={selectedRow.paymentMethod ?? ""} onSave={(v) => handleSave(selectedRow.id, "paymentMethod", v)} /> },
                { label: "Card #", node: <span className="text-gray-700">{selectedRow.cardLast4 ? `**** ${selectedRow.cardLast4}` : "—"}</span> },
                { label: "Invoice #", node: <EditableCell value={selectedRow.invoiceNumber ?? ""} onSave={(v) => handleSave(selectedRow.id, "invoiceNumber", v)} /> },
                { label: "Notes", node: <EditableCell value={selectedRow.notes ?? ""} onSave={(v) => handleSave(selectedRow.id, "notes", v)} /> },
              ]
            : []
        }
      />
    </div>
  );
}
