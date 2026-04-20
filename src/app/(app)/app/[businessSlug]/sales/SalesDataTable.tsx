"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateSalesEntry } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";

export type SalesRow = {
  id: string;
  date: string | null;
  sku: string;
  itemName: string | null;
  qty: number;
  salePriceCents: number;
  totalSaleCents: number;
  paymentMethod: string | null;
  channel: string | null;
  costCents: number;
  profitCents: number;
  marginPct: number | null;
  notes: string | null;
};

export default function SalesDataTable({
  businessSlug,
  initialRows,
}: {
  businessSlug: string;
  initialRows: SalesRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSave(
    id: string,
    field: keyof Omit<SalesRow, "id" | "totalSaleCents" | "profitCents" | "marginPct">,
    value: string
  ) {
    const numVal = /^\d+$/.test(value) ? parseInt(value, 10) : undefined;
    const payload: Record<string, unknown> = {};
    if (field === "date") payload.date = value || null;
    else if (field === "sku") payload.sku = value;
    else if (field === "itemName") payload.itemName = value || null;
    else if (field === "qty" && numVal !== undefined) payload.qty = numVal;
    else if (field === "salePriceCents" && numVal !== undefined)
      payload.salePriceCents = numVal;
    else if (field === "paymentMethod") payload.paymentMethod = value || null;
    else if (field === "channel") payload.channel = value || null;
    else if (field === "costCents" && numVal !== undefined) payload.costCents = numVal;
    else if (field === "notes") payload.notes = value || null;

    const res = await updateSalesEntry(id, businessSlug, payload as Parameters<typeof updateSalesEntry>[2]);
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
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
                Sale Channel
              </th>
              <th className="sticky top-0 z-10 px-3 py-2">
                Qty
              </th>
              <th className="sticky top-0 z-10 px-3 py-2">
                Sale Price
              </th>
              <th className="sticky top-0 z-10 px-3 py-2">
                Total Sale
              </th>
              <th className="sticky top-0 z-10 px-3 py-2">
                Payment Method
              </th>
              <th className="sticky top-0 z-10 px-3 py-2">
                Cost
              </th>
              <th className="sticky top-0 z-10 px-3 py-2">
                Profit
              </th>
              <th className="sticky top-0 z-10 px-3 py-2">
                Margin %
              </th>
              <th className="sticky top-0 z-10 px-3 py-2">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {initialRows.map((row) => {
              const totalSale = row.totalSaleCents ?? 0;
              const profit = row.profitCents ?? 0;
              const margin = row.marginPct ?? 0;
              const dateStr = row.date ? row.date.slice(0, 10) : "";
              return (
                <tr
                  key={row.id}
                  className="border-t border-gray-100"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={dateStr}
                      onSave={(v) => handleSave(row.id, "date", v)}
                      type="date"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={row.sku}
                      onSave={(v) => handleSave(row.id, "sku", v)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={row.channel ?? ""}
                      onSave={(v) => handleSave(row.id, "channel", v)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={String(row.qty)}
                      onSave={(v) => handleSave(row.id, "qty", v)}
                      type="number"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={String(row.salePriceCents)}
                      onSave={(v) => handleSave(row.id, "salePriceCents", v)}
                      type="currency"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    ${(totalSale / 100).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={row.paymentMethod ?? ""}
                      onSave={(v) => handleSave(row.id, "paymentMethod", v)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={String(row.costCents)}
                      onSave={(v) => handleSave(row.id, "costCents", v)}
                      type="currency"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    ${(profit / 100).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {margin.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={row.notes ?? ""}
                      onSave={(v) => handleSave(row.id, "notes", v)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isPending && (
        <p className="mt-2 text-xs text-gray-500">Saving…</p>
      )}
    </div>
  );
}
