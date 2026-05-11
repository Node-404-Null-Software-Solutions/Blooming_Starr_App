"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
import { useProductIntakeFilter, ProductIntakeFilterPanel } from "./ProductIntakeFilterPopover";
import { updateProductIntake, deleteProductIntake } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";

type ProductRow = {
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

export default function ProductIntakeClient({
  businessSlug,
  rows,
  showAdd,
}: {
  businessSlug: string;
  rows: ProductRow[];
  showAdd: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isOpen, setIsOpen, hasActiveFilters, filters, setFilters, apply, clear, cancel } =
    useProductIntakeFilter();

  const filteredRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aTime = Date.parse(a.dateSort);
      const bTime = Date.parse(b.dateSort);
      const aValue = Number.isNaN(aTime) ? 0 : aTime;
      const bValue = Number.isNaN(bTime) ? 0 : bTime;
      return bValue - aValue;
    });
  }, [rows]);

  const selectedRow = filteredRows.find((r) => r.id === selectedId) ?? null;

  async function handleSave(id: string, field: keyof Omit<ProductRow, "id" | "dateSort" | "unitCost">, value: string) {
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
    else if (field === "sku") payload.sku = value;
    else if (field === "totalCostCents" && numVal !== undefined) payload.totalCostCents = numVal;
    else if (field === "paymentMethod") payload.paymentMethod = value || null;
    else if (field === "cardLast4") payload.cardLast4 = value || null;
    else if (field === "invoiceNumber") payload.invoiceNumber = value || null;
    else if (field === "notes") payload.notes = value || null;

    const res = await updateProductIntake(id, businessSlug, payload as Parameters<typeof updateProductIntake>[2]);
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    const res = await deleteProductIntake(id, businessSlug);
    if (res.ok) {
      setSelectedId(null);
      startTransition(() => router.refresh());
    }
  }

  const hasRows = rows.length > 0;

  return (
    <div className="space-y-6">
      <div className="relative">
        <ModuleHeader
          title="Product Intake"
          addHref={showAdd ? `/app/${businessSlug}/product-intake/new` : undefined}
          onFilterClick={() => setIsOpen((prev) => !prev)}
          filterActive={hasActiveFilters}
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
        <div className="rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
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

          <div className="md:hidden space-y-2">
            {filteredRows.map((row) => (
              <div
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                className="rounded-lg border border-gray-200 bg-white p-3 cursor-pointer active:bg-green-50"
              >
                <p className="text-sm font-medium">{row.date?.slice(0, 10) ?? "—"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {row.sku} · {row.vendor !== "—" ? row.vendor : "—"} · qty {row.qty}
                </p>
                {row.category !== "—" && (
                  <p className="text-xs text-gray-400 mt-0.5">{row.category}</p>
                )}
              </div>
            ))}
          </div>


          <div className="hidden md:block overflow-x-auto">
            <div className="rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[1800px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                    <th className="sticky top-0 z-10 px-3 py-2">Date</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Vendor</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Source</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Category</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Size</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Style</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Purchase #</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Qty</th>
                    <th className="sticky top-0 z-10 px-3 py-2">SKU</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Unit Cost</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Total Cost</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Payment Method</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Card #</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Invoice #</th>
                    <th className="sticky top-0 z-10 px-3 py-2">Associated Product / Notes</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  {filteredRows.map((row) => {
                    const unitCostDollars = row.qty > 0 ? row.totalCostCents / 100 / row.qty : 0;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedId(row.id)}
                        className="border-t border-gray-100 cursor-pointer hover:bg-green-50/40"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.date} onSave={(v) => handleSave(row.id, "date", v)} type="date" />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.vendor === "—" ? "" : row.vendor} onSave={(v) => handleSave(row.id, "vendor", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.source === "—" ? "" : row.source} onSave={(v) => handleSave(row.id, "source", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.category === "—" ? "" : row.category} onSave={(v) => handleSave(row.id, "category", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.size === "—" ? "" : row.size} onSave={(v) => handleSave(row.id, "size", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.style === "—" ? "" : row.style} onSave={(v) => handleSave(row.id, "style", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.purchaseNumber === "—" ? "" : row.purchaseNumber} onSave={(v) => handleSave(row.id, "purchaseNumber", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={String(row.qty)} onSave={(v) => handleSave(row.id, "qty", v)} type="number" />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.sku} onSave={(v) => handleSave(row.id, "sku", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">${unitCostDollars.toFixed(2)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={String(row.totalCostCents)} onSave={(v) => handleSave(row.id, "totalCostCents", v)} type="currency" />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.paymentMethod === "—" ? "" : row.paymentMethod} onSave={(v) => handleSave(row.id, "paymentMethod", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.cardLast4 ?? ""} onSave={(v) => handleSave(row.id, "cardLast4", v)} />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <EditableCell value={row.invoiceNumber === "—" ? "" : row.invoiceNumber} onSave={(v) => handleSave(row.id, "invoiceNumber", v)} />
                        </td>
                        <td className="px-3 py-2">
                          <EditableCell value={row.notes === "—" ? "" : row.notes} onSave={(v) => handleSave(row.id, "notes", v)} />
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
        title={selectedRow ? `${selectedRow.date?.slice(0, 10) ?? "Entry"} — ${selectedRow.sku}` : ""}
        onDelete={() => selectedRow && handleDelete(selectedRow.id)}
        fields={
          selectedRow
            ? [
                { label: "Date", node: <EditableCell value={selectedRow.date} onSave={(v) => handleSave(selectedRow.id, "date", v)} type="date" /> },
                { label: "Vendor", node: <EditableCell value={selectedRow.vendor === "—" ? "" : selectedRow.vendor} onSave={(v) => handleSave(selectedRow.id, "vendor", v)} /> },
                { label: "Source", node: <EditableCell value={selectedRow.source === "—" ? "" : selectedRow.source} onSave={(v) => handleSave(selectedRow.id, "source", v)} /> },
                { label: "Category", node: <EditableCell value={selectedRow.category === "—" ? "" : selectedRow.category} onSave={(v) => handleSave(selectedRow.id, "category", v)} /> },
                { label: "Size", node: <EditableCell value={selectedRow.size === "—" ? "" : selectedRow.size} onSave={(v) => handleSave(selectedRow.id, "size", v)} /> },
                { label: "Style", node: <EditableCell value={selectedRow.style === "—" ? "" : selectedRow.style} onSave={(v) => handleSave(selectedRow.id, "style", v)} /> },
                { label: "Purchase #", node: <EditableCell value={selectedRow.purchaseNumber === "—" ? "" : selectedRow.purchaseNumber} onSave={(v) => handleSave(selectedRow.id, "purchaseNumber", v)} /> },
                { label: "Qty", node: <EditableCell value={String(selectedRow.qty)} onSave={(v) => handleSave(selectedRow.id, "qty", v)} type="number" /> },
                { label: "SKU", node: <EditableCell value={selectedRow.sku} onSave={(v) => handleSave(selectedRow.id, "sku", v)} /> },
                { label: "Unit Cost", node: <span className="text-gray-700">${selectedRow.qty > 0 ? (selectedRow.totalCostCents / 100 / selectedRow.qty).toFixed(2) : "0.00"}</span> },
                { label: "Total Cost", node: <EditableCell value={String(selectedRow.totalCostCents)} onSave={(v) => handleSave(selectedRow.id, "totalCostCents", v)} type="currency" /> },
                { label: "Payment Method", node: <EditableCell value={selectedRow.paymentMethod === "—" ? "" : selectedRow.paymentMethod} onSave={(v) => handleSave(selectedRow.id, "paymentMethod", v)} /> },
                { label: "Card #", node: <EditableCell value={selectedRow.cardLast4 ?? ""} onSave={(v) => handleSave(selectedRow.id, "cardLast4", v)} /> },
                { label: "Invoice #", node: <EditableCell value={selectedRow.invoiceNumber === "—" ? "" : selectedRow.invoiceNumber} onSave={(v) => handleSave(selectedRow.id, "invoiceNumber", v)} /> },
                { label: "Notes", node: <EditableCell value={selectedRow.notes === "—" ? "" : selectedRow.notes} onSave={(v) => handleSave(selectedRow.id, "notes", v)} /> },
              ]
            : []
        }
      />
    </div>
  );
}
