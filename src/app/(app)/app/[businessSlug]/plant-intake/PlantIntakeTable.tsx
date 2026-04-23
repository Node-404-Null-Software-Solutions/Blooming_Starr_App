"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updatePlantIntake, deletePlantIntake } from "@/lib/actions/data-entries";
import { EditableCell } from "@/components/data-table/EditableCell";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";

export type PlantIntakeRow = {
  id: string;
  date: string | null;
  source: string;
  genus: string;
  cultivar: string;
  locationCode: string | null;
  sku: string;
  qty: number;
  costCents: number;
  msrpCents: number;
  potType: string | null;
  paymentMethod: string | null;
  cardLast4: string | null;
};

export default function PlantIntakeTable({
  rows,
  businessSlug,
}: {
  rows: PlantIntakeRow[];
  businessSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRow = rows.find((r) => r.id === selectedId) ?? null;

  async function handleSave(
    id: string,
    field: keyof Omit<PlantIntakeRow, "id">,
    value: string
  ) {
    const numVal = /^\d+$/.test(value) ? parseInt(value, 10) : undefined;
    const payload: Record<string, unknown> = {};
    if (field === "date") payload.date = value || null;
    else if (field === "source") payload.source = value;
    else if (field === "genus") payload.genus = value;
    else if (field === "cultivar") payload.cultivar = value;
    else if (field === "locationCode") payload.locationCode = value || null;
    else if (field === "sku") payload.sku = value;
    else if (field === "qty" && numVal !== undefined) payload.qty = numVal;
    else if (field === "costCents" && numVal !== undefined) payload.costCents = numVal;
    else if (field === "msrpCents" && numVal !== undefined) payload.msrpCents = numVal;
    else if (field === "potType") payload.potType = value || null;
    else if (field === "paymentMethod") payload.paymentMethod = value || null;
    else if (field === "cardLast4") payload.cardLast4 = value || null;

    const res = await updatePlantIntake(
      id,
      businessSlug,
      payload as Parameters<typeof updatePlantIntake>[2]
    );
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    const res = await deletePlantIntake(id, businessSlug);
    if (res.ok) {
      setSelectedId(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div>
      {/* Mobile cards */}
      {rows.length === 0 ? (
        <p className="md:hidden py-4 text-center text-sm text-gray-500">No plant intake records yet.</p>
      ) : (
        <div className="md:hidden space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              onClick={() => setSelectedId(row.id)}
              className="rounded-lg border border-gray-200 bg-white p-3 cursor-pointer active:bg-green-50"
            >
              <p className="text-sm font-medium">{row.date?.slice(0, 10) ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {row.sku} · {row.source} · qty {row.qty}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{row.genus} {row.cultivar}</p>
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <div className="rounded-md border border-gray-200 bg-white">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="text-left text-sm">
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">Date</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">Source</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">Genus</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">Cultivar</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">ID #</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">SKU</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">QTY</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">Cost</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">MSRP</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">Pot Type</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">Payment Method</th>
                <th className="sticky top-0 z-10 bg-gray-50 px-4 py-3 font-semibold text-gray-700">Card Number</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-6 text-center text-sm text-gray-500">
                    No plant intake records yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className="border-b border-gray-200 even:bg-gray-50 last:border-b-0 cursor-pointer hover:bg-green-50/40"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={row.date ?? ""} onSave={(v) => handleSave(row.id, "date", v)} type="date" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={row.source} onSave={(v) => handleSave(row.id, "source", v)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={row.genus} onSave={(v) => handleSave(row.id, "genus", v)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={row.cultivar} onSave={(v) => handleSave(row.id, "cultivar", v)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={row.locationCode ?? ""} onSave={(v) => handleSave(row.id, "locationCode", v)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={row.sku} onSave={(v) => handleSave(row.id, "sku", v)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={String(row.qty)} onSave={(v) => handleSave(row.id, "qty", v)} type="number" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={String(row.costCents)} onSave={(v) => handleSave(row.id, "costCents", v)} type="currency" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={String(row.msrpCents)} onSave={(v) => handleSave(row.id, "msrpCents", v)} type="currency" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={row.potType ?? ""} onSave={(v) => handleSave(row.id, "potType", v)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={row.paymentMethod ?? ""} onSave={(v) => handleSave(row.id, "paymentMethod", v)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EditableCell value={row.cardLast4 ?? ""} onSave={(v) => handleSave(row.id, "cardLast4", v)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isPending && <p className="mt-2 text-xs text-gray-500">Saving…</p>}

      <RowDetailDrawer
        isOpen={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={selectedRow ? `${selectedRow.date?.slice(0, 10) ?? "Entry"} — ${selectedRow.sku}` : ""}
        onDelete={() => selectedRow && handleDelete(selectedRow.id)}
        fields={
          selectedRow
            ? [
                { label: "Date", node: <EditableCell value={selectedRow.date ?? ""} onSave={(v) => handleSave(selectedRow.id, "date", v)} type="date" /> },
                { label: "Source", node: <EditableCell value={selectedRow.source} onSave={(v) => handleSave(selectedRow.id, "source", v)} /> },
                { label: "Genus", node: <EditableCell value={selectedRow.genus} onSave={(v) => handleSave(selectedRow.id, "genus", v)} /> },
                { label: "Cultivar", node: <EditableCell value={selectedRow.cultivar} onSave={(v) => handleSave(selectedRow.id, "cultivar", v)} /> },
                { label: "ID #", node: <EditableCell value={selectedRow.locationCode ?? ""} onSave={(v) => handleSave(selectedRow.id, "locationCode", v)} /> },
                { label: "SKU", node: <EditableCell value={selectedRow.sku} onSave={(v) => handleSave(selectedRow.id, "sku", v)} /> },
                { label: "QTY", node: <EditableCell value={String(selectedRow.qty)} onSave={(v) => handleSave(selectedRow.id, "qty", v)} type="number" /> },
                { label: "Cost", node: <EditableCell value={String(selectedRow.costCents)} onSave={(v) => handleSave(selectedRow.id, "costCents", v)} type="currency" /> },
                { label: "MSRP", node: <EditableCell value={String(selectedRow.msrpCents)} onSave={(v) => handleSave(selectedRow.id, "msrpCents", v)} type="currency" /> },
                { label: "Pot Type", node: <EditableCell value={selectedRow.potType ?? ""} onSave={(v) => handleSave(selectedRow.id, "potType", v)} /> },
                { label: "Payment Method", node: <EditableCell value={selectedRow.paymentMethod ?? ""} onSave={(v) => handleSave(selectedRow.id, "paymentMethod", v)} /> },
                { label: "Card Number", node: <EditableCell value={selectedRow.cardLast4 ?? ""} onSave={(v) => handleSave(selectedRow.id, "cardLast4", v)} /> },
              ]
            : []
        }
      />
    </div>
  );
}
