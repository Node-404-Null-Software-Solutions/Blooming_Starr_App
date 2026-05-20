"use client";

import { useState } from "react";
import PlantIntakeTable, { type PlantIntakeRow } from "./PlantIntakeTable";
import PlantIntakeToolbar from "./PlantIntakeToolbar";

export default function PlantIntakeClient({
  businessSlug,
  genusOptions,
  rows,
}: {
  businessSlug: string;
  genusOptions: string[];
  rows: PlantIntakeRow[];
}) {
  const [selectMode, setSelectMode] = useState(false);
  const [editMode, setEditMode] = useState(false);

  function toggleSelectMode() {
    setSelectMode((value) => !value);
    setEditMode(false);
  }

  function toggleEditMode() {
    setEditMode((value) => !value);
    setSelectMode(false);
  }

  return (
    <>
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
        selectMode={selectMode}
        editMode={editMode}
        onEditModeChange={setEditMode}
      />
    </>
  );
}
