"use client";

import { useState, useRef, useEffect } from "react";

type EditableCellProps = {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "currency" | "number" | "date" | "select";
  options?: readonly string[];
  className?: string;
  title?: string;
};

function formatCurrency(cents: number): string {
  if (!Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(2);
}

function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function getEditableValue(value: string, type: EditableCellProps["type"]): string {
  if (type === "currency" && value && /^\d+$/.test(value)) {
    return formatCurrency(parseInt(value, 10));
  }

  return value;
}

export function EditableCell({
  value,
  onSave,
  type = "text",
  options,
  className = "",
  title,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const isSelect = type === "select" && options && options.length > 0;

  useEffect(() => {
    if (editing) {
      if (isSelect) {
        selectRef.current?.focus();
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [editing, isSelect]);

  const beginEditing = () => {
    setInputValue(getEditableValue(value, type));
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    const trimmed = inputValue.trim();
    if (type === "currency") {
      const cents = parseCurrencyInput(trimmed || "0");
      const prevCents = value ? parseInt(value, 10) : 0;
      if (!Number.isFinite(prevCents) || cents !== prevCents) onSave(String(cents));
    } else if (trimmed !== value) {
      onSave(trimmed);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setInputValue(v);
    onSave(v);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      setInputValue(value);
      setEditing(false);
      inputRef.current?.blur();
      selectRef.current?.blur();
    }
  };

  if (editing && isSelect) {
    return (
      <select
        ref={selectRef}
        value={inputValue}
        onChange={handleSelectChange}
        onBlur={() => setEditing(false)}
        onKeyDown={handleKeyDown}
        className={`w-full min-w-0 rounded border border-green-500 bg-white px-2 py-1 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-green-500 ${className}`}
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (editing) {
    const isNumber = type === "number";
    const isDate = type === "date";
    const inputType = isDate ? "date" : type === "currency" || isNumber ? "number" : "text";
    return (
      <input
        ref={inputRef}
        type={inputType}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full min-w-0 rounded border border-green-500 bg-white px-2 py-1 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-green-500 ${className}`}
        step={type === "currency" ? "0.01" : undefined}
      />
    );
  }

  const display =
    type === "currency" && value && /^\d+$/.test(value)
      ? `$${formatCurrency(parseInt(value, 10))}`
      : type === "date" && value
        ? value.slice(0, 10)
        : value || "—";

  return (
    <div
      role="button"
      tabIndex={0}
      title={title ?? "Click to edit"}
      onClick={beginEditing}
      onKeyDown={(e) => e.key === "Enter" && beginEditing()}
      className={`cursor-cell rounded px-1 py-0.5 outline-none hover:bg-green-50 focus:bg-green-50 focus:ring-1 focus:ring-green-500 ${className}`}
    >
      {display}
    </div>
  );
}
