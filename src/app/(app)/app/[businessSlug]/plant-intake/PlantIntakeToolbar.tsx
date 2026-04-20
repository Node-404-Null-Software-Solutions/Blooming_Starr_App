"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ModuleHeader from "../_components/ModuleHeader";

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
  isOwner,
  genusOptions,
}: PlantIntakeToolbarProps) {
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
    <ModuleHeader
      title="Plant Intake"
      importHref={`/app/${businessSlug}/plant-intake/import`}
      addHref={`/app/${businessSlug}/plant-intake/new`}
      onFilterClick={() => setIsOpen((prev) => !prev)}
      filterActive={hasActiveFilters}
      rightSlot={
        isOpen ? (
          <div className="absolute right-0 top-12 z-20 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
            <div className="space-y-3 text-sm text-gray-700">
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
        ) : null
      }
    />
  );
}
