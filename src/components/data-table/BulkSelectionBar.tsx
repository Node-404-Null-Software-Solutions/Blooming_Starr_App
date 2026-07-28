"use client";

import { Trash2, X } from "lucide-react";
import { useBusinessPermissions } from "@/components/permissions/BusinessPermissions";

export default function BulkSelectionBar({
  count,
  isDeleting = false,
  onClear,
  onDelete,
}: {
  count: number;
  isDeleting?: boolean;
  onClear: () => void;
  onDelete: () => void;
}) {
  const { canManageOperations } = useBusinessPermissions();
  if (!canManageOperations) return null;

  return (
    <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
      <span aria-live="polite">
        {count} row{count === 1 ? "" : "s"} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          disabled={count === 0 || isDeleting}
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-gray-300 bg-white px-3 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={count === 0 || isDeleting}
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-red-200 bg-white px-3 font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Deleting…" : "Delete selected"}
        </button>
      </div>
    </div>
  );
}
