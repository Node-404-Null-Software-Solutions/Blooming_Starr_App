"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Filters = {
  from: string;
  to: string;
  channel: string;
  q: string;
};

const emptyFilters: Filters = {
  from: "",
  to: "",
  channel: "",
  q: "",
};

function filtersFromSearchParams(params: URLSearchParams): Filters {
  return {
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    channel: params.get("channel") ?? "",
    q: params.get("q") ?? "",
  };
}

const FILTER_KEYS: (keyof Filters)[] = ["from", "to", "channel", "q"];

export function SalesFilterPopover() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(() =>
    filtersFromSearchParams(searchParams)
  );

  useEffect(() => {
    if (!isOpen) {
      setFilters(filtersFromSearchParams(searchParams));
    }
  }, [isOpen, searchParams]);

  const hasActiveFilters = useMemo(
    () => FILTER_KEYS.some((key) => Boolean(searchParams.get(key))),
    [searchParams]
  );

  const handleApply = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => {
      const v = filters[key];
      if (v) nextParams.set(key, v);
      else nextParams.delete(key);
    });
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setIsOpen(false);
  };

  const handleClear = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => nextParams.delete(key));
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setFilters(emptyFilters);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setFilters(filtersFromSearchParams(searchParams));
    setIsOpen(false);
  };

  return {
    isOpen,
    setIsOpen,
    hasActiveFilters,
    filters,
    setFilters,
    handleApply,
    handleClear,
    handleCancel,
  };
}

export function SalesFilterPanel({
  isOpen,
  filters,
  setFilters,
  onApply,
  onClear,
  onCancel,
}: {
  isOpen: boolean;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onApply: () => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="absolute right-0 top-12 z-20 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
      <div className="space-y-3 text-sm text-gray-700">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              From
            </span>
            <input
              type="date"
              className="rounded-md border border-gray-300 px-2 py-1.5"
              value={filters.from}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, from: e.target.value }))
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
              value={filters.to}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, to: e.target.value }))
              }
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Channel
          </span>
          <input
            type="text"
            className="rounded-md border border-gray-300 px-2 py-1.5"
            placeholder="e.g. Retail"
            value={filters.channel}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, channel: e.target.value }))
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Search (SKU / Item / Notes)
          </span>
          <input
            type="text"
            className="rounded-md border border-gray-300 px-2 py-1.5"
            placeholder="Search…"
            value={filters.q}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, q: e.target.value }))
            }
          />
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-md bg-(--primary) px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
