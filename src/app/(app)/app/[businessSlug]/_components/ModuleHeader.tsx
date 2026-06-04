"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckSquare, Filter, Pencil, Plus } from "lucide-react";

type ModuleHeaderProps = {
  title: string;
  addHref?: string;
  showFilter?: boolean;
  rightSlot?: ReactNode;
  onFilterClick?: () => void;
  filterActive?: boolean;
  selectMode?: boolean;
  editMode?: boolean;
  onSelectClick?: () => void;
  onEditClick?: () => void;
};

export default function ModuleHeader({
  title,
  addHref,
  showFilter = true,
  rightSlot,
  onFilterClick,
  filterActive = false,
  selectMode = false,
  editMode = false,
  onSelectClick,
  onEditClick,
}: ModuleHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <div className="relative flex items-center gap-2">
          {addHref ? (
            <Link
              href={addHref}
              className="inline-flex items-center gap-2 rounded-md bg-(--primary) px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add
            </Link>
          ) : null}
          {showFilter && onFilterClick ? (
            <button
              type="button"
              onClick={onFilterClick}
              className={`rounded-md border p-2 text-gray-700 hover:bg-gray-100 ${
                filterActive
                  ? "border-(--primary) text-(--primary)"
                  : "border-gray-300"
              }`}
              aria-label="Filter"
              title="Filter"
            >
              <Filter className="h-4 w-4" />
            </button>
          ) : null}
          {onSelectClick ? (
            <button
              type="button"
              onClick={onSelectClick}
              className={`rounded-md border p-2 text-gray-700 hover:bg-gray-100 ${
                selectMode
                  ? "border-(--primary) text-(--primary)"
                  : "border-gray-300"
              }`}
              aria-label="Select rows"
              aria-pressed={selectMode}
              title="Select item"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
          ) : null}
          {onEditClick ? (
            <button
              type="button"
              onClick={onEditClick}
              className={`rounded-md border p-2 text-gray-700 hover:bg-gray-100 ${
                editMode
                  ? "border-(--primary) text-(--primary)"
                  : "border-gray-300"
              }`}
              aria-label="Edit rows"
              aria-pressed={editMode}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
          {rightSlot}
        </div>
      </div>
    </div>
  );
}
