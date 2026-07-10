"use client";

import type { ReactNode } from "react";
import { ChevronDown, Minus, Plus, Save, X } from "lucide-react";
import type { LookupRow } from "@/lib/actions/lookups";

export const intakeFieldClass =
  "h-12 w-full min-w-0 rounded-sm border border-gray-300 bg-white px-3 text-center text-lg text-gray-900 outline-none focus:border-[#08bd12] focus:ring-1 focus:ring-[#08bd12]";

export const intakeStepperInputClass =
  "h-full min-w-0 flex-1 bg-transparent px-3 text-center text-lg text-gray-900 outline-none";

export function IntakeEditActionBar({
  onCancel,
  isSaving,
  error,
}: {
  onCancel: () => void;
  isSaving: boolean;
  error: string;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex h-8 items-center gap-1 rounded-sm border border-[#08bd12] bg-white px-3 text-base text-[#08bd12] hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-8 items-center gap-1 rounded-sm bg-[#08bd12] px-4 text-base font-medium text-white hover:bg-[#08aa12] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving" : "Save"}
        </button>
      </div>
      {error ? <p className="mt-2 text-center text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function IntakeFormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-y-5 px-4 py-7 sm:gap-y-[25px]">
      {children}
    </div>
  );
}

export function IntakeFormRow({
  children,
  label,
  required = false,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-y-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-x-7">
      <span className="text-center text-sm text-gray-600">
        {label}
        {required ? <span className="text-[#08bd12]">*</span> : null}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function IntakeChevronInput({
  name,
  value,
  onChange,
  maxLength,
  required = false,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <div className="relative min-w-0">
      <input
        type="text"
        name={name}
        value={value}
        maxLength={maxLength}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={`${intakeFieldClass} pr-10`}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
    </div>
  );
}

export function IntakeDatalistInput({
  name,
  listId,
  value,
  onChange,
  required = false,
}: {
  name: string;
  listId: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative min-w-0">
      <input
        type="text"
        name={name}
        list={listId}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={`${intakeFieldClass} pr-10`}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
    </div>
  );
}

export function IntakeSelectInput({
  name,
  value,
  onChange,
  options,
  required = false,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: LookupRow[];
  required?: boolean;
}) {
  return (
    <div className="relative min-w-0">
      <select
        name={name}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={`${intakeFieldClass} appearance-none pr-10`}
      >
        <option value="" />
        {options.map((item) => (
          <option key={item.id} value={item.name}>
            {item.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
    </div>
  );
}

export function IntakeStepperShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-full min-w-0 items-center overflow-hidden rounded-sm border border-gray-300 bg-white focus-within:border-[#08bd12] focus-within:ring-1 focus-within:ring-[#08bd12]">
      {children}
    </div>
  );
}

export function IntakeStepperButtons({
  onDecrement,
  onIncrement,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex h-full shrink-0 items-center gap-2 px-3 text-gray-600 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onDecrement}
        className="inline-flex h-7 w-7 items-center justify-center hover:text-gray-900"
        aria-label="Decrease value"
      >
        <Minus className="h-5 w-5 stroke-[3]" />
      </button>
      <button
        type="button"
        onClick={onIncrement}
        className="inline-flex h-7 w-7 items-center justify-center hover:text-gray-900"
        aria-label="Increase value"
      >
        <Plus className="h-5 w-5 stroke-[3]" />
      </button>
    </div>
  );
}

export function IntakeDatalistOptions({
  id,
  options,
  valueKey = "name",
}: {
  id: string;
  options: LookupRow[];
  valueKey?: "name" | "code";
}) {
  return (
    <datalist id={id}>
      {options.map((item) => (
        <option key={item.id} value={item[valueKey]}>
          {item.name} ({item.code})
        </option>
      ))}
    </datalist>
  );
}
