"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckSquare, ListFilter, Pencil, Plus } from "lucide-react";
import {
  SalesFilterPopover,
  SalesFilterPanel,
} from "./SalesFilterPopover";
import SalesDataTable, { type SalesRow } from "./SalesDataTable";

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
      <div className="border-b border-gray-200 bg-white">
        <div className="flex h-12 items-center justify-between px-4">
          <h1 className="text-base font-normal text-gray-800">Sales</h1>
          <div className="relative flex items-center gap-2">
            <Link
              href={`/app/${businessSlug}/sales/new`}
              className="inline-flex h-8 items-center gap-1 rounded-sm bg-[#08bd12] px-3 text-sm font-medium text-white hover:bg-[#08aa12]"
              title="Add"
            >
              <Plus className="h-4 w-4" />
              Add
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100 ${
                hasActiveFilters ? "text-[#08bd12]" : ""
              }`}
              aria-label="Filter"
              title="Filter"
            >
              <ListFilter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleSelectMode}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-sm hover:bg-gray-100 ${
                selectMode ? "bg-green-50 text-[#08bd12]" : "text-gray-600"
              }`}
              aria-label="Select rows"
              aria-pressed={selectMode}
              title="Select item"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleEditMode}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-sm hover:bg-gray-100 ${
                editMode ? "bg-green-50 text-[#08bd12]" : "text-gray-600"
              }`}
              aria-label="Edit rows"
              aria-pressed={editMode}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <SalesFilterPanel
              isOpen={isOpen}
              filters={filters}
              setFilters={setFilters}
              onApply={handleApply}
              onClear={handleClear}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
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
