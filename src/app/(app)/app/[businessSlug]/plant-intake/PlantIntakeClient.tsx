"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PlantIntakeTable, { type PlantIntakeRow } from "./PlantIntakeTable";
import PlantIntakeToolbar from "./PlantIntakeToolbar";
import {
  deletePlantIntake,
  updatePlantIntake,
  type PlantIntakeUpdate,
} from "@/lib/actions/data-entries";
import type { LookupRow } from "@/lib/actions/lookups";
import { MasterDetailLayout } from "@/components/data-table/MasterDetailLayout";
import { RowDetailDrawer } from "@/components/data-table/RowDetailDrawer";
import { formatAppDate } from "@/lib/date-format";
import PlantIntakeDetailEditForm from "./PlantIntakeDetailEditForm";

function displayCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PlantIntakeClient({
  businessSlug,
  genusOptions,
  lookups,
  rows,
}: {
  businessSlug: string;
  genusOptions: string[];
  lookups: Record<string, LookupRow[]>;
  rows: PlantIntakeRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [clientRows, setClientRows] = useState(rows);
  const [selectMode, setSelectMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const selectedRow = clientRows.find((row) => row.id === selectedId) ?? null;
  const detailOpen = selectedId !== null && !editMode && !selectMode;

  useEffect(() => {
    setClientRows(rows);
  }, [rows]);

  useEffect(() => {
    if (!selectedId) setDetailEditMode(false);
  }, [selectedId]);

  function toggleSelectMode() {
    setSelectMode((value) => !value);
    setEditMode(false);
    setDetailEditMode(false);
  }

  function toggleEditMode() {
    setEditMode((value) => !value);
    setSelectMode(false);
    setDetailEditMode(false);
  }

  function closeDetail() {
    setDetailEditMode(false);
    setSelectedId(null);
  }

  function applyPlantDetailUpdate(row: PlantIntakeRow, data: PlantIntakeUpdate) {
    const next = { ...row };
    if (data.date !== undefined) next.date = data.date;
    if (data.source !== undefined) next.source = data.source;
    if (data.genus !== undefined) next.genus = data.genus;
    if (data.cultivar !== undefined) next.cultivar = data.cultivar;
    if (data.locationCode !== undefined) next.locationCode = data.locationCode;
    if (data.qty !== undefined) next.qty = data.qty;
    if (data.costCents !== undefined) next.costCents = data.costCents;
    if (data.msrpCents !== undefined) next.msrpCents = data.msrpCents;
    if (data.potType !== undefined) next.potType = data.potType;
    if (data.paymentMethod !== undefined) next.paymentMethod = data.paymentMethod;
    if (data.cardLast4 !== undefined) next.cardLast4 = data.cardLast4;
    next.totalCostCents = next.costCents * next.qty;
    return next;
  }

  async function handleDetailSave(data: PlantIntakeUpdate) {
    if (!selectedRow) return { ok: false, error: "No row selected" };
    setDetailSaving(true);
    try {
      const res = await updatePlantIntake(selectedRow.id, businessSlug, data);
      if (res.ok) {
        setClientRows((current) =>
          current.map((row) =>
            row.id === selectedRow.id ? applyPlantDetailUpdate(row, data) : row
          )
        );
        setDetailEditMode(false);
        startTransition(() => router.refresh());
      }
      return res;
    } finally {
      setDetailSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    const res = await deletePlantIntake(id, businessSlug);
    if (res.ok) {
      closeDetail();
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
          onClose={closeDetail}
          title={
            selectedRow
              ? `${formatAppDate(selectedRow.date, "Entry")} - ${selectedRow.sku}`
              : ""
          }
          onDelete={() => selectedRow && handleDelete(selectedRow.id)}
          onEdit={() => setDetailEditMode(true)}
          isEditing={detailEditMode}
          editContent={
            selectedRow ? (
              <PlantIntakeDetailEditForm
                row={selectedRow}
                lookups={lookups}
                isSaving={detailSaving}
                onCancel={() => setDetailEditMode(false)}
                onSave={handleDetailSave}
              />
            ) : null
          }
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
          rows={clientRows}
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
