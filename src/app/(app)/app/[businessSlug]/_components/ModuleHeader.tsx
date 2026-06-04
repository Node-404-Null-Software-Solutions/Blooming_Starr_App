"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckSquare, ListFilter, Pencil, Plus } from "lucide-react";

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
  const iconButtonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100";
  const activeIconButtonClass = "bg-green-50 text-[#08bd12]";

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex h-12 items-center justify-between px-4">
        <h1 className="text-base font-normal text-gray-800">{title}</h1>
        <div className="relative flex items-center gap-2">
          {addHref ? (
            <Link
              href={addHref}
              className="inline-flex h-8 items-center gap-1 rounded-sm bg-[#08bd12] px-3 text-sm font-medium text-white hover:bg-[#08aa12]"
              title="Add"
            >
              <Plus className="h-4 w-4" />
              Add
            </Link>
          ) : null}
          {showFilter && onFilterClick ? (
            <button
              type="button"
              onClick={onFilterClick}
              className={`${iconButtonClass} ${filterActive ? activeIconButtonClass : ""}`}
              aria-label="Filter"
              title="Filter"
            >
              <ListFilter className="h-4 w-4" />
            </button>
          ) : null}
          {onSelectClick ? (
            <button
              type="button"
              onClick={onSelectClick}
              className={`${iconButtonClass} ${selectMode ? activeIconButtonClass : ""}`}
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
              className={`${iconButtonClass} ${editMode ? activeIconButtonClass : ""}`}
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
