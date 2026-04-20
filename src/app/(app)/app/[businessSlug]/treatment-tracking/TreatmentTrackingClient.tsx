"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
import { useTreatmentFilter, TreatmentFilterPanel } from "./TreatmentFilterPopover";
import { updateTreatmentTracking } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";

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
  const { isOpen, setIsOpen, hasActiveFilters, filters, setFilters, apply, clear, cancel } =
    useTreatmentFilter();

  const formatDate = (date: string | null) =>
    date ? date.slice(0, 10) : "—";

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

  return (
    <div className="space-y-6">
      <div className="relative">
        <ModuleHeader
          title="Treatment Tracking"
          importHref={`/app/${businessSlug}/treatment-tracking/import`}
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
              href={`/app/${businessSlug}/treatment-tracking/import`}
              className="inline-flex items-center rounded-md bg-(--primary) px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Import
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[1500px] border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Date
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    SKU
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Target
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Product
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Active Ingredient
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    EPA #
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Rate
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Pot Size
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Method
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Initials
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Next Earliest Application
                  </th>
                  <th className="sticky top-0 z-10 px-3 py-2">
                    Next Latest Application
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.date ?? ""} onSave={(v) => handleSave(row.id, "date", v)} type="date" />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.sku} onSave={(v) => handleSave(row.id, "sku", v)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.target ?? ""} onSave={(v) => handleSave(row.id, "target", v)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.product ?? ""} onSave={(v) => handleSave(row.id, "product", v)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.activeIngredient ?? ""} onSave={(v) => handleSave(row.id, "activeIngredient", v)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.epaNumber ?? ""} onSave={(v) => handleSave(row.id, "epaNumber", v)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.rate ?? ""} onSave={(v) => handleSave(row.id, "rate", v)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.potSize ?? ""} onSave={(v) => handleSave(row.id, "potSize", v)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.method ?? ""} onSave={(v) => handleSave(row.id, "method", v)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EditableCell value={row.initials ?? ""} onSave={(v) => handleSave(row.id, "initials", v)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.nextEarliest)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.nextLatest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {hasRows && isPending && <p className="text-xs text-gray-500">Saving…</p>}
    </div>
  );
}
