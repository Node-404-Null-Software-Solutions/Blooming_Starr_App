"use client";

import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import QrScanButton from "@/components/qr/QrScanButton";

export const logFormFieldClass =
  "h-12 w-full rounded-sm border border-gray-300 bg-white px-3 text-lg text-gray-900 outline-none focus:border-[#08bd12] focus:ring-1 focus:ring-[#08bd12]";

export const logFormScanButtonClass =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";

type LogFormShellProps = {
  action: (fd: FormData) => Promise<void>;
  children: ReactNode;
};

export function LogFormShell({ action, children }: LogFormShellProps) {
  return (
    <form action={action} className="min-h-[calc(100vh-3.5rem)] bg-white pb-24">
      {children}
    </form>
  );
}

type LogFormHeaderProps = {
  backHref: string;
  backLabel: string;
  icon: ReactNode;
  title: string;
  srLabel?: string;
};

export function LogFormHeader({
  backHref,
  backLabel,
  icon,
  title,
  srLabel,
}: LogFormHeaderProps) {
  return (
    <div className="sticky top-0 z-20 flex h-[60px] items-center justify-between bg-[#08bd12] px-4 text-white shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-white hover:bg-white/10"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-white">
          {icon}
        </div>
        <h1 className="truncate text-lg font-medium">{title}</h1>
        {srLabel ? <span className="sr-only">{srLabel}</span> : null}
      </div>
    </div>
  );
}

export function LogFormBody({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[620px] gap-y-[25px] px-4 pt-7">
      {children}
    </div>
  );
}

type LogFormFooterProps = {
  cancelHref: string;
  cancelLabel?: string;
  submitLabel?: string;
};

export function LogFormFooter({
  cancelHref,
  cancelLabel = "Cancel",
  submitLabel = "Save",
}: LogFormFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] md:left-12">
      <div className="mx-auto flex max-w-[620px] justify-end gap-3">
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center rounded-sm border border-[#08bd12] bg-white px-4 text-base font-medium text-[#08bd12] hover:bg-green-50"
        >
          {cancelLabel}
        </Link>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-sm bg-[#08bd12] px-5 text-base font-medium text-white hover:bg-[#08aa12]"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export function FormRow({
  children,
  label,
  alignStart = false,
  htmlFor,
}: {
  children: ReactNode;
  label: string;
  alignStart?: boolean;
  htmlFor?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[150px_minmax(0,1fr)] gap-x-7 ${
        alignStart ? "items-start" : "items-center"
      }`}
    >
      <label
        htmlFor={htmlFor}
        className={`text-sm text-gray-600 ${alignStart ? "pt-3" : ""}`}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function LogFormFieldGroup({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 2 | 3;
}) {
  const columnsClass = columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return <div className={`grid gap-2 ${columnsClass}`}>{children}</div>;
}

export function ScannableDatalistRow({
  label,
  name,
  value,
  onChange,
  listId,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  listId?: string;
  placeholder?: string;
}) {
  return (
    <FormRow label={label}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            name={name}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            list={listId}
            className={`${logFormFieldClass} pr-10`}
            placeholder={placeholder}
          />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
        <QrScanButton
          label={`Scan ${label}`}
          onScan={onChange}
          iconOnly
          className={logFormScanButtonClass}
        />
      </div>
    </FormRow>
  );
}

export function ScannableSelectOrInputRow({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <FormRow label={label}>
      <div className="flex gap-2">
        <SelectOrInputControl
          name={name}
          value={value}
          onChange={onChange}
          options={options}
          placeholder={placeholder}
        />
        <QrScanButton
          label={`Scan ${label}`}
          onScan={onChange}
          iconOnly
          className={logFormScanButtonClass}
        />
      </div>
    </FormRow>
  );
}

export function SelectOrInputRow({
  label,
  name,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  options: string[];
  placeholder?: string;
}) {
  return (
    <FormRow label={label}>
      <SelectOrInputControl
        name={name}
        options={options}
        placeholder={placeholder}
      />
    </FormRow>
  );
}

export function SelectOrInputControl({
  name,
  options,
  placeholder,
  value,
  onChange,
}: {
  name: string;
  options: string[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const controlProps =
    value === undefined || !onChange
      ? {}
      : {
          value,
          onChange: (
            event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
          ) => onChange(event.target.value),
        };

  if (options.length > 0) {
    return (
      <div className="relative min-w-0 flex-1">
        <select
          name={name}
          className={`${logFormFieldClass} appearance-none pr-10`}
          defaultValue={value === undefined ? "" : undefined}
          {...controlProps}
        >
          <option value="" />
          {value && !options.includes(value) ? (
            <option value={value}>{value}</option>
          ) : null}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>
    );
  }

  return (
    <input
      type="text"
      name={name}
      className={logFormFieldClass}
      placeholder={placeholder}
      {...controlProps}
    />
  );
}

export function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
