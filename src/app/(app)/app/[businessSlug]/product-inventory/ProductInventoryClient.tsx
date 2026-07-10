"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  ImageIcon,
} from "lucide-react";
import ModuleHeader from "../_components/ModuleHeader";
import { centsToUsdFixed as money } from "@/lib/formulas";

export type ProductInventoryRow = {
  sku: string;
  date: string | null;
  dateSort: string;
  productName: string;
  status: string;
  unitCostCents: number;
  totalCostCents: number;
  qtyPurchased: number;
  qtySold: number;
  qtyRemaining: number;
  notes: string | null;
};

type Filters = {
  q: string;
  status: string;
  from: string;
  to: string;
};

const emptyFilters: Filters = { q: "", status: "", from: "", to: "" };

function inDateRange(row: ProductInventoryRow, from: string, to: string) {
  if (!from && !to) return true;
  if (!row.dateSort) return false;
  const rowTime = Date.parse(row.dateSort);
  if (Number.isNaN(rowTime)) return false;
  if (from) {
    const fromTime = Date.parse(from);
    if (!Number.isNaN(fromTime) && rowTime < fromTime) return false;
  }
  if (to) {
    const toTime = Date.parse(to);
    if (!Number.isNaN(toTime) && rowTime > toTime + 86_399_999) return false;
  }
  return true;
}

export default function ProductInventoryClient({
  businessSlug,
  rows,
  initialQ = "",
}: {
  businessSlug: string;
  rows: ProductInventoryRow[];
  initialQ?: string;
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  const [draftFilters, setDraftFilters] = useState<Filters>({
    ...emptyFilters,
    q: initialQ,
  });
  const [activeFilters, setActiveFilters] = useState<Filters>({
    ...emptyFilters,
    q: initialQ,
  });

  const statusOptions = useMemo(
    () => [...new Set(rows.map((row) => row.status).filter(Boolean))].sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const q = activeFilters.q.trim().toLowerCase();
    const status = activeFilters.status.trim().toLowerCase();
    return rows.filter((row) => {
      if (status && row.status.toLowerCase() !== status) return false;
      if (!inDateRange(row, activeFilters.from, activeFilters.to)) return false;
      if (!q) return true;
      return [
        row.date,
        row.productName,
        row.sku,
        row.status,
        row.notes ?? "",
      ].some((value) => (value ?? "").toLowerCase().includes(q));
    });
  }, [activeFilters, rows]);

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  function toggleSelectMode() {
    setSelectMode((value) => !value);
    setSelectedRows(new Set());
  }

  function toggleSelectedRow(sku: string) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  function toggleAllRows() {
    setSelectedRows((current) => {
      if (current.size === filteredRows.length) return new Set();
      return new Set(filteredRows.map((row) => row.sku));
    });
  }

  function applyFilters() {
    setActiveFilters(draftFilters);
    setIsFilterOpen(false);
  }

  function clearFilters() {
    setDraftFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setIsFilterOpen(false);
  }

  const headCell =
    "sticky top-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-800";
  const bodyCell =
    "border-b border-r border-gray-200 px-3 py-1.5 align-middle text-xs text-gray-700";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-white">
      <div className="relative">
        <ModuleHeader
          title="Product Inventory"
          onFilterClick={() => setIsFilterOpen((value) => !value)}
          filterActive={hasActiveFilters}
          selectMode={selectMode}
          onSelectClick={toggleSelectMode}
          rightSlot={
            isFilterOpen ? (
              <div className="absolute right-0 top-10 z-20 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2 text-sm font-medium text-gray-800">
                    <Filter className="h-4 w-4" />
                    Filters
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Search
                    </span>
                    <input
                      className="rounded-md border border-gray-300 px-2 py-1.5"
                      value={draftFilters.q}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          q: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </span>
                    <select
                      className="rounded-md border border-gray-300 px-2 py-1.5"
                      value={draftFilters.status}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                    >
                      <option value="">Any</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        From
                      </span>
                      <input
                        type="date"
                        className="rounded-md border border-gray-300 px-2 py-1.5"
                        value={draftFilters.from}
                        onChange={(event) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            from: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        To
                      </span>
                      <input
                        type="date"
                        className="rounded-md border border-gray-300 px-2 py-1.5"
                        value={draftFilters.to}
                        onChange={(event) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            to: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applyFilters}
                      className="rounded-md bg-(--primary) px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            ) : null
          }
        />
      </div>

      {selectMode ? (
        <div className="flex h-10 items-center border-b border-gray-200 bg-gray-50 px-4 text-sm text-gray-700">
          {selectedRows.size} row{selectedRows.size === 1 ? "" : "s"} selected
        </div>
      ) : null}

      {filteredRows.length === 0 ? (
        <div className="m-4 rounded-md border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          No product inventory data.{" "}
          <Link
            href={`/app/${businessSlug}/settings/import`}
            className="text-(--primary) hover:underline"
          >
            Import data
          </Link>{" "}
          to populate this view.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse bg-white">
            <thead>
              <tr>
                {selectMode ? (
                  <th className={`${headCell} w-12 text-center`}>
                    <button
                      type="button"
                      onClick={toggleAllRows}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-gray-300 bg-white"
                      aria-label="Select all visible rows"
                      aria-pressed={
                        filteredRows.length > 0 &&
                        selectedRows.size === filteredRows.length
                      }
                    >
                      {filteredRows.length > 0 &&
                      selectedRows.size === filteredRows.length ? (
                        <Check className="h-4 w-4 text-[#08bd12]" />
                      ) : null}
                    </button>
                  </th>
                ) : null}
                <th className={`${headCell} w-24`}>
                  <span className="inline-flex items-center gap-1">
                    Date <ChevronDown className="h-3 w-3" />
                  </span>
                </th>
                <th className={`${headCell} w-56`}>Product Name</th>
                <th className={`${headCell} w-40`}>SKU</th>
                <th className={`${headCell} w-28`}>Status</th>
                <th className={`${headCell} w-24`}>Unit Cost</th>
                <th className={`${headCell} w-24`}>Total Cost</th>
                <th className={`${headCell} w-28`}>QTY Purchased</th>
                <th className={`${headCell} w-24`}>QTY Sold</th>
                <th className={`${headCell} w-32`}>QTY Remaining</th>
                <th className={`${headCell} w-20`}>Photo</th>
                <th className={`${headCell} w-44`}>Notes</th>
                <th
                  className="sticky top-0 z-10 w-8 border-b border-gray-200 bg-white px-2 py-2"
                  aria-label="Open row"
                />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.sku}
                  onClick={() => selectMode && toggleSelectedRow(row.sku)}
                  className={`h-9 ${selectMode ? "cursor-pointer" : ""} hover:bg-green-50/50 ${
                    selectedRows.has(row.sku) ? "bg-green-50" : ""
                  }`}
                >
                  {selectMode ? (
                    <td className={`${bodyCell} text-center`}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSelectedRow(row.sku);
                        }}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-gray-300 bg-white"
                        aria-label={`Select ${row.sku}`}
                        aria-pressed={selectedRows.has(row.sku)}
                      >
                        {selectedRows.has(row.sku) ? (
                          <Check className="h-4 w-4 text-[#08bd12]" />
                        ) : null}
                      </button>
                    </td>
                  ) : null}
                  <td className={`${bodyCell} whitespace-nowrap`}>{row.date}</td>
                  <td
                    className={`${bodyCell} max-w-56 truncate`}
                    title={row.productName}
                  >
                    {row.productName}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap font-mono`}>
                    {row.sku}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap`}>{row.status}</td>
                  <td className={`${bodyCell} whitespace-nowrap`}>
                    {money(row.unitCostCents)}
                  </td>
                  <td className={`${bodyCell} whitespace-nowrap`}>
                    {money(row.totalCostCents)}
                  </td>
                  <td className={`${bodyCell} text-center`}>{row.qtyPurchased}</td>
                  <td className={`${bodyCell} text-center`}>{row.qtySold}</td>
                  <td className={`${bodyCell} text-center`}>{row.qtyRemaining}</td>
                  <td className={`${bodyCell} text-center`}>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-gray-100 text-gray-400">
                      <ImageIcon className="h-3.5 w-3.5" />
                    </span>
                  </td>
                  <td
                    className={`${bodyCell} max-w-44 truncate`}
                    title={row.notes ?? ""}
                  >
                    {row.notes ?? ""}
                  </td>
                  <td className="border-b border-gray-200 px-2 py-1.5 text-gray-900">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
