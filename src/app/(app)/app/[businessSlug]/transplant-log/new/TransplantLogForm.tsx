"use client";

import Link from "next/link";
import { useState } from "react";
import QrScanButton from "@/components/qr/QrScanButton";

const fieldClass = "rounded-md border border-gray-300 px-3 py-2 text-sm w-full";

function ScannableTextInput({
  name,
  label,
  value,
  onChange,
  placeholder,
  list,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  list?: string;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          list={list}
          className={fieldClass}
          placeholder={placeholder}
        />
        <QrScanButton label={`Scan ${label}`} onScan={onChange} iconOnly />
      </div>
    </div>
  );
}

function ScannableSelectOrInput({
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const hasOptions = options.length > 0;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        {hasOptions ? (
          <select
            name={name}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">-- select --</option>
            {value && !options.includes(value) ? (
              <option value={value}>{value}</option>
            ) : null}
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            name={name}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={fieldClass}
            placeholder={placeholder}
          />
        )}
        <QrScanButton label={`Scan ${label}`} onScan={onChange} iconOnly />
      </div>
    </div>
  );
}

function SelectOrInput({
  name,
  options,
  placeholder,
}: {
  name: string;
  options: string[];
  placeholder?: string;
}) {
  if (options.length > 0) {
    return (
      <select name={name} className={fieldClass}>
        <option value="">-- select --</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      name={name}
      className={fieldClass}
      placeholder={placeholder}
    />
  );
}

type TransplantLogFormProps = {
  businessSlug: string;
  action: (fd: FormData) => Promise<void>;
  skuList: string[];
  actionOptions: string[];
  mediaOptions: string[];
  potSizeOptions: string[];
  potColorOptions: string[];
};

export default function TransplantLogForm({
  businessSlug,
  action,
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
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Date</label>
        <input type="date" name="date" className={fieldClass} />
      </div>

      <ScannableTextInput
        name="originalSku"
        label="Original SKU"
        value={originalSku}
        onChange={setOriginalSku}
        list={skuList.length > 0 ? "sku-list" : undefined}
        placeholder="Type, select, or scan a SKU"
      />
      {skuList.length > 0 ? (
        <datalist id="sku-list">
          {skuList.map((sku) => (
            <option key={sku} value={sku} />
          ))}
        </datalist>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Action</label>
          <SelectOrInput
            name="action"
            options={actionOptions}
            placeholder="e.g. Up-pot, Division"
          />
        </div>
        <ScannableSelectOrInput
          name="media"
          label="Media"
          value={media}
          onChange={setMedia}
          options={mediaOptions}
          placeholder="e.g. Soil type"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">From pot</label>
          <SelectOrInput
            name="fromPot"
            options={potSizeOptions}
            placeholder={'e.g. 2.5"'}
          />
        </div>
        <ScannableSelectOrInput
          name="toPot"
          label="To pot"
          value={toPot}
          onChange={setToPot}
          options={potSizeOptions}
          placeholder={'e.g. 4"'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">ID code</label>
          <input
            type="text"
            name="idCode"
            className={fieldClass}
            placeholder="Internal ID"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">
            New / division SKU
          </label>
          <input
            type="text"
            name="divisionSku"
            className={fieldClass}
            placeholder="If applicable"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Cost per unit ($)</label>
          <input
            type="number"
            name="cost"
            step="0.01"
            min={0}
            defaultValue={0}
            className={fieldClass}
            placeholder="0.00"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Pot color</label>
          <SelectOrInput
            name="potColor"
            options={potColorOptions}
            placeholder="e.g. Black, White"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea
          name="notes"
          rows={2}
          className={fieldClass}
          placeholder="Optional notes"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Add log
        </button>
        <Link
          href={`/app/${businessSlug}/transplant-log`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
