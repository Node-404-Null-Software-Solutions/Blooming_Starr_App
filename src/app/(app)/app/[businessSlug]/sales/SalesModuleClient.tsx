"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SalesFilterPopover,
  SalesFilterPanel,
} from "./SalesFilterPopover";
import SalesDataTable, { type SalesRow } from "./SalesDataTable";
import ModuleHeader from "../_components/ModuleHeader";

type SalesModuleClientProps = {
  businessSlug: string;
  initialRows: SalesRow[];
  hasRows: boolean;
};

export default function SalesModuleClient({
  businessSlug,
  initialRows,
  hasRows,
}: SalesModuleClientProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const {
    isOpen,
    setIsOpen,
    hasActiveFilters,
    filters,
    setFilters,
    handleApply,
    handleClear,
    handleCancel,
  } = SalesFilterPopover();

  function toggleSelectMode() {
    setSelectMode((value) => !value);
    setEditMode(false);
  }

  function toggleEditMode() {
    setEditMode((value) => !value);
    setSelectMode(false);
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <ModuleHeader
        title="Sales"
        addHref={`/app/${businessSlug}/sales/new`}
        onFilterClick={() => setIsOpen((prev) => !prev)}
        filterActive={hasActiveFilters}
        onSelectClick={toggleSelectMode}
        onEditClick={toggleEditMode}
        selectMode={selectMode}
        editMode={editMode}
        rightSlot={
          <SalesFilterPanel
            isOpen={isOpen}
            filters={filters}
            setFilters={setFilters}
            onApply={handleApply}
            onClear={handleClear}
            onCancel={handleCancel}
          />
        }
      />
      {!hasRows ? (
        <div className="m-4 rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          <div className="text-base font-semibold text-gray-900">
            No sales entries yet.
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
        <SalesDataTable
          businessSlug={businessSlug}
          initialRows={initialRows}
          selectMode={selectMode}
          editMode={editMode}
        />
      )}
    </div>
  );
}
