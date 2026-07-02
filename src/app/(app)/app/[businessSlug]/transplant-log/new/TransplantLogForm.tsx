"use client";

import type { ChangeEvent, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronDown, Sprout } from "lucide-react";
import QrScanButton from "@/components/qr/QrScanButton";

const fieldClass =
  "h-12 w-full rounded-sm border border-gray-300 bg-white px-3 text-lg text-gray-900 outline-none focus:border-[#08bd12] focus:ring-1 focus:ring-[#08bd12]";

const scanButtonClass =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";

type TransplantLogFormProps = {
  businessSlug: string;
  action: (fd: FormData) => Promise<void>;
  logoUrl: string | null;
  businessName: string | null;
  skuList: string[];
  actionOptions: string[];
  mediaOptions: string[];
  potSizeOptions: string[];
  potColorOptions: string[];
};

export default function TransplantLogForm({
  businessSlug,
  action,
  logoUrl,
  businessName,
  skuList,
  actionOptions,
  mediaOptions,
  potSizeOptions,
  potColorOptions,
}: TransplantLogFormProps) {
  const [originalSku, setOriginalSku] = useState("");
  const [media, setMedia] = useState("");
  const [toPot, setToPot] = useState("");

  return (
    <form action={action} className="min-h-[calc(100vh-3.5rem)] bg-white pb-24">
      <div className="sticky top-0 z-20 flex h-[60px] items-center justify-between bg-[#08bd12] px-4 text-white shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/app/${businessSlug}/transplant-log`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-white hover:bg-white/10"
            aria-label="Back to transplant log"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-white">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt=""
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 object-contain"
              />
            ) : (
              <Sprout className="h-5 w-5 text-[#08bd12]" />
            )}
          </div>
          <h1 className="truncate text-lg font-medium">
            Transplant Log Form
          </h1>
          <span className="sr-only">{businessName ?? "Blooming Starr"}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-[620px] gap-y-[25px] px-4 pt-7">
        <FormRow label="Date">
          <input
            type="date"
            name="date"
            defaultValue={todayInputValue()}
            className={fieldClass}
          />
        </FormRow>

        <ScannableDatalistRow
          label="Original SKU"
          name="originalSku"
          value={originalSku}
          onChange={setOriginalSku}
          listId={skuList.length > 0 ? "transplant-original-sku-options" : undefined}
          placeholder="Select or scan a SKU"
        />

        <SelectOrInputRow
          label="Action"
          name="action"
          options={actionOptions}
          placeholder="e.g. Up-pot, Division"
        />

        <ScannableSelectOrInputRow
          label="Media"
          name="media"
          value={media}
          onChange={setMedia}
          options={mediaOptions}
          placeholder="Select soil/media"
        />

        <ScannableSelectOrInputRow
          label="To pot"
          name="toPot"
          value={toPot}
          onChange={setToPot}
          options={potSizeOptions}
          placeholder={'e.g. 4"'}
        />

        <FormRow label="ID">
          <input
            type="text"
            name="idCode"
            className={fieldClass}
            placeholder="Optional"
          />
        </FormRow>

        <FormRow label="New SKU">
          <input
            type="text"
            name="divisionSku"
            className={fieldClass}
            placeholder="Optional"
          />
        </FormRow>

        <SelectOrInputRow
          label="Pot color"
          name="potColor"
          options={potColorOptions}
          placeholder="e.g. Black, White"
        />

        <FormRow label="Notes" alignStart>
          <textarea
            name="notes"
            rows={3}
            className={`${fieldClass} min-h-24 py-3`}
            placeholder="Optional notes"
          />
        </FormRow>

        {skuList.length > 0 ? (
          <datalist id="transplant-original-sku-options">
            {skuList.map((sku) => (
              <option key={sku} value={sku} />
            ))}
          </datalist>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] md:left-12">
        <div className="mx-auto flex max-w-[620px] justify-end gap-3">
          <Link
            href={`/app/${businessSlug}/transplant-log`}
            className="inline-flex h-10 items-center rounded-sm border border-[#08bd12] bg-white px-4 text-base font-medium text-[#08bd12] hover:bg-green-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-sm bg-[#08bd12] px-5 text-base font-medium text-white hover:bg-[#08aa12]"
          >
            Save
          </button>
        </div>
      </div>
    </form>
  );
}

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function FormRow({
  children,
  label,
  alignStart = false,
}: {
  children: ReactNode;
  label: string;
  alignStart?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[150px_minmax(0,1fr)] gap-x-7 ${
        alignStart ? "items-start" : "items-center"
      }`}
    >
      <label className={`text-sm text-gray-600 ${alignStart ? "pt-3" : ""}`}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ScannableDatalistRow({
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
            className={`${fieldClass} pr-10`}
            placeholder={placeholder}
          />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
        <QrScanButton
          label={`Scan ${label}`}
          onScan={onChange}
          iconOnly
          className={scanButtonClass}
        />
      </div>
    </FormRow>
  );
}

function ScannableSelectOrInputRow({
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
          className={scanButtonClass}
        />
      </div>
    </FormRow>
  );
}

function SelectOrInputRow({
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

function SelectOrInputControl({
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
          className={`${fieldClass} appearance-none pr-10`}
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
      className={fieldClass}
      placeholder={placeholder}
      {...controlProps}
    />
  );
}
