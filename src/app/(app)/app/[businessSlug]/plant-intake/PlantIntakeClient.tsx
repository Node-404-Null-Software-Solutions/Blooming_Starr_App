"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PlantIntakeTable, { type PlantIntakeRow } from "./PlantIntakeTable";
import PlantIntakeToolbar from "./PlantIntakeToolbar";
import { deletePlantIntake } from "@/lib/actions/data-entries";
import { MasterDetailLayout } from "@/components/data-table/MasterDetailLayout";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";
import { formatAppDate } from "@/lib/date-format";

function displayCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PlantIntakeClient({
  businessSlug,
  genusOptions,
  rows,
}: {
  businessSlug: string;
  genusOptions: string[];
  rows: PlantIntakeRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectMode, setSelectMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const detailOpen = selectedId !== null && !editMode && !selectMode;

  function toggleSelectMode() {
    setSelectMode((value) => !value);
    setEditMode(false);
  }

  function toggleEditMode() {
    setEditMode((value) => !value);
    setSelectMode(false);
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
    <MasterDetailLayout
      isDetailOpen={detailOpen}
      className="min-h-[calc(100vh-3.5rem)] bg-white"
      detail={
        <RowDetailDrawer
          isOpen={detailOpen}
          onClose={() => setSelectedId(null)}
          title={
            selectedRow
              ? `${formatAppDate(selectedRow.date, "Entry")} - ${selectedRow.sku}`
              : ""
          }
          onDelete={() => selectedRow && handleDelete(selectedRow.id)}
          fields={
            selectedRow
              ? [
                  { label: "Date", node: <span>{formatAppDate(selectedRow.date, "-")}</span> },
                  { label: "Source", node: <span>{selectedRow.source || "-"}</span> },
                  { label: "Genus", node: <span>{selectedRow.genus || "-"}</span> },
                  { label: "Cultivar", node: <span>{selectedRow.cultivar || "-"}</span> },
                  { label: "ID #", node: <span>{selectedRow.locationCode ?? "-"}</span> },
                  { label: "SKU", node: <span className="font-mono text-gray-700">{selectedRow.sku}</span> },
                  { label: "QTY", node: <span>{selectedRow.qty}</span> },
                  { label: "Total Cost", node: <span>{displayCurrency(selectedRow.totalCostCents)}</span> },
                  { label: "Unit Cost", node: <span>{displayCurrency(selectedRow.costCents)}</span> },
                  { label: "MSRP", node: <span>{displayCurrency(selectedRow.msrpCents)}</span> },
                  { label: "Pot Type", node: <span>{selectedRow.potType ?? "-"}</span> },
                  { label: "Payment Method", node: <span>{selectedRow.paymentMethod ?? "-"}</span> },
                  { label: "Card Number", node: <span>{selectedRow.cardLast4 ?? "-"}</span> },
                ]
              : []
          }
        />
      }
    >
      <div className="min-h-[calc(100vh-3.5rem)] bg-white">
        <PlantIntakeToolbar
          businessSlug={businessSlug}
          isOwner={true}
          genusOptions={genusOptions}
          selectMode={selectMode}
          editMode={editMode}
          onToggleSelectMode={toggleSelectMode}
          onToggleEditMode={toggleEditMode}
        />
        <PlantIntakeTable
          rows={rows}
          businessSlug={businessSlug}
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          selectMode={selectMode}
          editMode={editMode}
          onEditModeChange={setEditMode}
        />
      </div>
    </MasterDetailLayout>
  );
}
