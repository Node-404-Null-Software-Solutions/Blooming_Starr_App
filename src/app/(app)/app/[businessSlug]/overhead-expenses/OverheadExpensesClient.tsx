"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
import { useOverheadFilter, OverheadFilterPanel } from "./OverheadFilterPopover";
import { updateOverheadExpense } from "@/lib/actions/data-entries";
import { centsToUsdFixed } from "@/lib/formulas";
import { EditableCell } from "@/components/data-table/EditableCell";

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
  const { isOpen, setIsOpen, hasActiveFilters, filters, setFilters, apply, clear, cancel } =
    useOverheadFilter();

  const formatDate = (date: string | null) =>
    date ? date.slice(0, 10) : "—";

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

  return (
    <div className="space-y-6">
      <div className="relative">
        <ModuleHeader
          title="Overhead Expenses"
          importHref={`/app/${businessSlug}/overhead-expenses/import`}
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
              href={`/app/${businessSlug}/overhead-expenses/import`}
              className="inline-flex items-center rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Import
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[1700px] border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Date
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Vendor
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Brand
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Category
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Description
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Qty
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Subtotal
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Discount
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Unit Cost
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Actual Total
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Payment Method
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Card #
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Invoice #
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Notes/Project
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {rows.map((row) => {
                  const subtotal = row.subTotalCents ?? 0;
                  const actualTotal = row.totalCents ?? 0;
                  return (
                    <tr key={row.id} className="border-t border-gray-100">
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
      )}
      {hasRows && isPending && <p className="text-xs text-gray-500">Saving…</p>}
    </div>
  );
}
