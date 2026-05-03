"use client";

import { useState } from "react";
import Link from "next/link";
import { buildProductSku, suggestLookupCode } from "@/lib/sku";
import type { LookupRow } from "@/lib/actions/lookups";

type Props = {
  businessSlug: string;
  action: (fd: FormData) => Promise<void>;
  lookups: Record<string, LookupRow[]>;
};

function findLookupByName(rows: LookupRow[], value: string) {
  const key = value.trim().toLowerCase();
  return rows.find((row) => row.name.toLowerCase() === key);
}

function findLookupByNameOrCode(rows: LookupRow[], value: string) {
  const key = value.trim().toLowerCase();
  return rows.find(
    (row) => row.name.toLowerCase() === key || row.code.toLowerCase() === key
  );
}

function codeForValue(
  rows: LookupRow[],
  value: string,
  options: Parameters<typeof suggestLookupCode>[2] = {},
  matchCode = false
) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const entry = matchCode
    ? findLookupByNameOrCode(rows, trimmed)
    : findLookupByName(rows, trimmed);
  return (
    entry?.code ??
    suggestLookupCode(
      trimmed,
      rows.map((row) => row.code),
      options
    )
  );
}

export default function ProductIntakeForm({ businessSlug, action, lookups }: Props) {
  const sources = lookups.productSource ?? [];
  const categories = lookups.productCategory ?? [];
  const sizes = lookups.productSize ?? [];
  const styles = lookups.productStyle ?? [];
  const paymentMethods = lookups.paymentMethod ?? [];

  const [sourceCode, setSourceCode] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [sizeValue, setSizeValue] = useState("");
  const [sizeCode, setSizeCode] = useState("");
  const [styleCode, setStyleCode] = useState("");
  const [styleName, setStyleName] = useState("");
  const [purchaseNumber, setPurchaseNumber] = useState("");
  const [sku, setSku] = useState("");
  const [manualSku, setManualSku] = useState(false);

  function updateSku(sc?: string, catc?: string, szc?: string, stc?: string, pn?: string) {
    if (manualSku) return;
    const s = sc ?? sourceCode;
    const cat = catc ?? categoryCode;
    const sz = szc ?? sizeCode;
    const st = stc ?? styleCode;
    const p = pn ?? purchaseNumber;
    if (s && cat) {
      setSku(buildProductSku(s, cat, sz, st, p));
    }
  }

  function onSourceChange(value: string) {
    const code = codeForValue(sources, value);
    setSourceName(value);
    setSourceCode(code);
    updateSku(code, undefined, undefined, undefined, undefined);
  }

  function onCategoryChange(value: string) {
    const code = codeForValue(categories, value);
    setCategoryName(value);
    setCategoryCode(code);
    updateSku(undefined, code, undefined, undefined, undefined);
  }

  function onSizeChange(value: string) {
    const code = codeForValue(
      sizes,
      value,
      { maxLength: 10, preserveNumericCodeLike: true },
      true
    );
    setSizeValue(value);
    setSizeCode(code);
    updateSku(undefined, undefined, code, undefined, undefined);
  }

  function onStyleChange(value: string) {
    const code = codeForValue(styles, value);
    setStyleName(value);
    setStyleCode(code);
    updateSku(undefined, undefined, undefined, code, undefined);
  }

  function onPurchaseNumberChange(value: string) {
    setPurchaseNumber(value);
    updateSku(undefined, undefined, undefined, undefined, value);
  }

  const selectClass =
    "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white";
  const inputClass = "rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Date</label>
        <input type="date" name="date" className={inputClass} />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">
          SKU{" "}
          {!manualSku && (
            <span className="text-xs text-gray-400">(auto-generated)</span>
          )}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            name="sku"
            required
            value={sku}
            onChange={(e) => {
              setSku(e.target.value);
              setManualSku(true);
            }}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
            placeholder="e.g. AM-PO-6-NU-1"
          />
          {manualSku && (
            <button
              type="button"
              onClick={() => {
                setManualSku(false);
                if (sourceCode && categoryCode) {
                  setSku(buildProductSku(sourceCode, categoryCode, sizeCode, styleCode, purchaseNumber));
                }
              }}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Auto
            </button>
          )}
        </div>
        <input type="hidden" name="skuWasManual" value={manualSku ? "1" : ""} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Source *</label>
          <input
            type="text"
            name="source"
            list="product-source-options"
            required
            value={sourceName}
            onChange={(e) => onSourceChange(e.target.value)}
            className={inputClass}
            placeholder="Select or type source..."
          />
          <datalist id="product-source-options">
            {sources.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} ({s.code})
              </option>
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Category *</label>
          <input
            type="text"
            name="category"
            list="product-category-options"
            required
            value={categoryName}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={inputClass}
            placeholder="Select or type category..."
          />
          <datalist id="product-category-options">
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} ({c.code})
              </option>
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Size</label>
          <input
            type="text"
            name="size"
            list="product-size-options"
            value={sizeValue}
            onChange={(e) => onSizeChange(e.target.value)}
            className={inputClass}
            placeholder="Select or type size..."
          />
          <datalist id="product-size-options">
            {sizes.map((s) => (
              <option key={s.id} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Style</label>
          <input
            type="text"
            name="style"
            list="product-style-options"
            value={styleName}
            onChange={(e) => onStyleChange(e.target.value)}
            className={inputClass}
            placeholder="Select or type style..."
          />
          <datalist id="product-style-options">
            {styles.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} ({s.code})
              </option>
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Purchase #</label>
        <input
          type="text"
          name="purchaseNumber"
          value={purchaseNumber}
          onChange={(e) => onPurchaseNumberChange(e.target.value)}
          className={inputClass}
          placeholder="e.g. 1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Qty *</label>
          <input
            type="number"
            name="qty"
            min={1}
            defaultValue={1}
            required
            className={inputClass}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Total cost ($) *</label>
          <input
            type="number"
            name="totalCost"
            step="0.01"
            min={0}
            required
            className={inputClass}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Payment method</label>
          <select name="paymentMethod" className={selectClass}>
            <option value="">Select...</option>
            {paymentMethods.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Card last 4</label>
          <input
            type="text"
            name="cardLast4"
            maxLength={4}
            className={inputClass}
            placeholder="e.g. 6921"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Vendor</label>
        <input
          type="text"
          name="vendor"
          className={inputClass}
          placeholder="e.g. Grower Co"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Invoice number</label>
        <input
          type="text"
          name="invoiceNumber"
          className={inputClass}
          placeholder="e.g. INV-001"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea
          name="notes"
          rows={2}
          className={inputClass}
          placeholder="Associated product or other notes"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Add product
        </button>
        <Link
          href={`/app/${businessSlug}/product-intake`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
