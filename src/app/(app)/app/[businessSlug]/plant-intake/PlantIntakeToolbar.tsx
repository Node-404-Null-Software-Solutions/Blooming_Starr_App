"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, Filter, ListFilter, Pencil, Plus } from "lucide-react";

type Filters = {
  priceType: "msrp" | "cost" | "";
  minPrice: string;
  maxPrice: string;
  from: string;
  to: string;
  genus: string;
};

type PlantIntakeToolbarProps = {
  businessSlug: string;
  isOwner: boolean;
  genusOptions?: string[];
  selectMode?: boolean;
  editMode?: boolean;
  onToggleSelectMode?: () => void;
  onToggleEditMode?: () => void;
};

const emptyFilters: Filters = {
  priceType: "",
  minPrice: "",
  maxPrice: "",
  from: "",
  to: "",
  genus: "",
};

function filtersFromSearchParams(params: URLSearchParams): Filters {
  const priceType = params.get("priceType");
  return {
    priceType: priceType === "msrp" || priceType === "cost" ? priceType : "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    genus: params.get("genus") ?? "",
  };
}

export default function PlantIntakeToolbar({
  businessSlug,
  genusOptions,
  selectMode = false,
  editMode = false,
  onToggleSelectMode,
  onToggleEditMode,
}: PlantIntakeToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(() =>
    filtersFromSearchParams(searchParams)
  );

  const setOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(isOpen) : value;
    if (next) {
      setFilters(filtersFromSearchParams(searchParams));
    }
    setIsOpen(next);
  };

  const hasActiveFilters = useMemo(() => {
    return [
      "priceType",
      "minPrice",
      "maxPrice",
      "from",
      "to",
      "genus",
    ].some((key) => Boolean(searchParams.get(key)));
  }, [searchParams]);

  const handleApply = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (filters.priceType) nextParams.set("priceType", filters.priceType);
    else nextParams.delete("priceType");
    if (filters.minPrice) nextParams.set("minPrice", filters.minPrice);
    else nextParams.delete("minPrice");
    if (filters.maxPrice) nextParams.set("maxPrice", filters.maxPrice);
    else nextParams.delete("maxPrice");
    if (filters.from) nextParams.set("from", filters.from);
    else nextParams.delete("from");
    if (filters.to) nextParams.set("to", filters.to);
    else nextParams.delete("to");
    if (filters.genus) nextParams.set("genus", filters.genus);
    else nextParams.delete("genus");

    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setIsOpen(false);
  };

  const handleClear = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    ["priceType", "minPrice", "maxPrice", "from", "to", "genus"].forEach((key) =>
      nextParams.delete(key)
    );
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setFilters(emptyFilters);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setFilters(filtersFromSearchParams(searchParams));
    setIsOpen(false);
  };

  const genusHasOptions = Boolean(genusOptions && genusOptions.length > 0);

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex h-12 items-center justify-between px-4">
        <h1 className="text-base font-normal text-gray-800">Plant Intake</h1>
        <div className="relative flex items-center gap-2">
          <Link
            href={`/app/${businessSlug}/plant-intake/new`}
            className="inline-flex h-8 items-center gap-1 rounded-sm bg-[#08bd12] px-3 text-sm font-medium text-white hover:bg-[#08aa12]"
          >
            <Plus className="h-4 w-4" />
            Add
          </Link>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100 ${
              hasActiveFilters ? "text-[#08bd12]" : ""
            }`}
            aria-label="Filter"
          >
            <ListFilter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleSelectMode}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-sm hover:bg-gray-100 ${
              selectMode ? "bg-green-50 text-[#08bd12]" : "text-gray-600"
            }`}
            aria-label="Select rows"
            aria-pressed={selectMode}
          >
            <CheckSquare className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleEditMode}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-sm hover:bg-gray-100 ${
              editMode ? "bg-green-50 text-[#08bd12]" : "text-gray-600"
            }`}
            aria-label="Edit rows"
            aria-pressed={editMode}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {isOpen ? (
            <div className="absolute right-0 top-10 z-20 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2 text-sm font-medium text-gray-800">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Price Type
                  </span>
                  <select
                    className="rounded-md border border-gray-300 px-2 py-1.5"
                    value={filters.priceType}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceType: event.target.value as Filters["priceType"],
                      }))
                    }
                  >
                    <option value="">Select</option>
                    <option value="msrp">MSRP</option>
                    <option value="cost">Cost</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Genus
                  </span>
                  {genusHasOptions ? (
                    <select
                      className="rounded-md border border-gray-300 px-2 py-1.5"
                      value={filters.genus}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          genus: event.target.value,
                        }))
                      }
                    >
                      <option value="">Any</option>
                      {genusOptions?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="rounded-md border border-gray-300 px-2 py-1.5"
                      placeholder="e.g. Monstera"
                      value={filters.genus}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          genus: event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Min Price
                  </span>
                  <input
                    className="rounded-md border border-gray-300 px-2 py-1.5"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={filters.minPrice}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        minPrice: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Max Price
                  </span>
                  <input
                    className="rounded-md border border-gray-300 px-2 py-1.5"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={filters.maxPrice}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        maxPrice: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    From
                  </span>
                  <input
                    type="date"
                    className="rounded-md border border-gray-300 px-2 py-1.5"
                    value={filters.from}
                    onChange={(event) =>
                      setFilters((prev) => ({
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
                    value={filters.to}
                    onChange={(event) =>
                      setFilters((prev) => ({
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
                  onClick={handleClear}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="rounded-md bg-(--primary) px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
