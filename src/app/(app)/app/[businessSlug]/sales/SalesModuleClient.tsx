"use client";

import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
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

  return (
    <div className="space-y-6">
      <div className="relative">
        <ModuleHeader
          title="Sales"
          addHref={`/app/${businessSlug}/sales/new`}
          onFilterClick={() => setIsOpen((prev) => !prev)}
          filterActive={hasActiveFilters}
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
      </div>
      {!hasRows ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
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
        <SalesDataTable businessSlug={businessSlug} initialRows={initialRows} />
      )}
    </div>
  );
}
