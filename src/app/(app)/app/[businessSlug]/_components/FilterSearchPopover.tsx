"use client";

import { useRef, useEffect } from "react";

type FilterSearchPopoverProps = {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
};

export function FilterSearchPopover({
  value,
  onChange,
  onClose,
  placeholder = "Search…",
}: FilterSearchPopoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="absolute right-0 top-12 z-20 w-80 rounded-md border border-gray-200 bg-white p-4 shadow-lg">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
      />
      <div className="mt-3 flex justify-end gap-2">
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}
