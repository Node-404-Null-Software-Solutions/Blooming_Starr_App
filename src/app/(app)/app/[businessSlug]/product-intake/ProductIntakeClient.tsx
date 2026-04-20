"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
import { useProductIntakeFilter, ProductIntakeFilterPanel } from "./ProductIntakeFilterPopover";
import { updateProductIntake } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";

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

  const hasRows = rows.length > 0;

  return (
    <div className="space-y-6">
      <div className="relative">
        <ModuleHeader
          title="Product Intake"
          importHref={`/app/${businessSlug}/product-intake/import`}
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
              href={`/app/${businessSlug}/product-intake/import`}
              className="inline-flex items-center rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Import
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[1800px] border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Date
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Vendor
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Source
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Category
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Size
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Style
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Purchase #
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Qty
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    SKU
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Unit Cost
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Total Cost
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
                    Associated Product / Notes
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {filteredRows.map((row) => {
                  const totalCostDollars = row.totalCostCents / 100;
                  const unitCostDollars = row.qty > 0 ? row.totalCostCents / 100 / row.qty : 0;
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100"
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
      )}
      {hasRows && isPending && <p className="text-xs text-gray-500">Saving…</p>}
    </div>
  );
}
