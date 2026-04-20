"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Filters = { from: string; to: string; plantSku: string; potSku: string; product: string };
const empty: Filters = { from: "", to: "", plantSku: "", potSku: "", product: "" };

function fromParams(p: URLSearchParams): Filters {
  return {
    from: p.get("from") ?? "",
    to: p.get("to") ?? "",
    plantSku: p.get("plantSku") ?? "",
    potSku: p.get("potSku") ?? "",
    product: p.get("product") ?? "",
  };
}

const KEYS: (keyof Filters)[] = ["from", "to", "plantSku", "potSku", "product"];

export function useFertilizerFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => fromParams(sp));
  useEffect(() => {
    if (!isOpen) setFilters(fromParams(sp));
  }, [isOpen, sp]);
  const hasActive = useMemo(() => KEYS.some((k) => Boolean(sp.get(k))), [sp]);
  const apply = () => {
    const next = new URLSearchParams(sp.toString());
    KEYS.forEach((k) => (filters[k] ? next.set(k, filters[k]) : next.delete(k)));
    router.push(next.toString() ? `${pathname}?${next}` : pathname);
    setIsOpen(false);
  };
  const clear = () => {
    const next = new URLSearchParams(sp.toString());
    KEYS.forEach((k) => next.delete(k));
    router.push(next.toString() ? `${pathname}?${next}` : pathname);
    setFilters(empty);
    setIsOpen(false);
  };
  const cancel = () => {
    setFilters(fromParams(sp));
    setIsOpen(false);
  };
  return { isOpen, setIsOpen, hasActiveFilters: hasActive, filters, setFilters, apply, clear, cancel };
}

export function FertilizerFilterPanel({
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
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">From</span>
            <input type="date" className="rounded-md border border-gray-300 px-2 py-1.5" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">To</span>
            <input type="date" className="rounded-md border border-gray-300 px-2 py-1.5" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Plant SKU</span>
          <input type="text" className="rounded-md border border-gray-300 px-2 py-1.5" value={filters.plantSku} onChange={(e) => setFilters((p) => ({ ...p, plantSku: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pot SKU</span>
          <input type="text" className="rounded-md border border-gray-300 px-2 py-1.5" value={filters.potSku} onChange={(e) => setFilters((p) => ({ ...p, potSku: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Product</span>
          <input type="text" className="rounded-md border border-gray-300 px-2 py-1.5" value={filters.product} onChange={(e) => setFilters((p) => ({ ...p, product: e.target.value }))} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClear} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Clear</button>
          <button type="button" onClick={onCancel} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
          <button type="button" onClick={onApply} className="rounded-md bg-(--primary) px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Apply</button>
        </div>
      </div>
    </div>
  );
}
