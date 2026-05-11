"use client";

import { useState } from "react";
import Link from "next/link";
import { buildPlantSku, suggestLookupCode } from "@/lib/sku";
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

export default function PlantIntakeForm({ businessSlug, action, lookups }: Props) {
  const sources = lookups.plantSource ?? [];
  const genera = lookups.genus ?? [];
  const cultivars = lookups.cultivar ?? [];
  const plantIds = lookups.plantId ?? [];
  const paymentMethods = lookups.paymentMethod ?? [];
  const statuses = lookups.status ?? [];

  const [sourceCode, setSourceCode] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [genusCode, setGenusCode] = useState("");
  const [genusName, setGenusName] = useState("");
  const [cultivarCode, setCultivarCode] = useState("");
  const [cultivarName, setCultivarName] = useState("");
  const [idCode, setIdCode] = useState("");
  const [idSkuCode, setIdSkuCode] = useState("");
  const [sku, setSku] = useState("");
  const [manualSku, setManualSku] = useState(false);

  function updateSku(sc?: string, gc?: string, cc?: string, ic?: string) {
    if (manualSku) return;
    const s = sc ?? sourceCode;
    const g = gc ?? genusCode;
    const c = cc ?? cultivarCode;
    const i = ic ?? idSkuCode;
    if (s && g && c) {
      setSku(buildPlantSku(s, g, c, i));
    }
  }

  function onSourceChange(value: string) {
    const code = codeForValue(sources, value);
    setSourceName(value);
    setSourceCode(code);
    updateSku(code, undefined, undefined, undefined);
  }

  function onGenusChange(value: string) {
    const code = codeForValue(genera, value);
    setGenusName(value);
    setGenusCode(code);
    setCultivarName("");
    setCultivarCode("");
    updateSku(undefined, code, "", undefined);
  }

  function onCultivarChange(value: string) {
    const code = codeForValue(cultivars, value);
    setCultivarName(value);
    setCultivarCode(code);
    updateSku(undefined, undefined, code, undefined);
  }

  function onIdChange(value: string) {
    const code = codeForValue(
      plantIds,
      value,
      { maxLength: 10, preserveCodeLike: true },
      true
    );
    setIdCode(value);
    setIdSkuCode(code);
    updateSku(undefined, undefined, undefined, code);
  }


  const filteredCultivars = genusCode
    ? cultivars.filter((c) => !c.parentCode || c.parentCode === genusCode)
    : cultivars;

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
            placeholder="e.g. HS-BE-AW-1A"
          />
          {manualSku && (
            <button
              type="button"
              onClick={() => {
                setManualSku(false);
                if (sourceCode && genusCode && cultivarCode) {
                  setSku(buildPlantSku(sourceCode, genusCode, cultivarCode, idSkuCode));
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
            list="plant-source-options"
            required
            value={sourceName}
            onChange={(e) => onSourceChange(e.target.value)}
            className={inputClass}
            placeholder="Select or type source..."
          />
          <datalist id="plant-source-options">
            {sources.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} ({s.code})
              </option>
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Genus *</label>
          <input
            type="text"
            name="genus"
            list="plant-genus-options"
            required
            value={genusName}
            onChange={(e) => onGenusChange(e.target.value)}
            className={inputClass}
            placeholder="Select or type genus..."
          />
          <datalist id="plant-genus-options">
            {genera.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name} ({g.code})
              </option>
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Cultivar *</label>
        <input
          type="text"
          name="cultivar"
          list="plant-cultivar-options"
          required
          value={cultivarName}
          onChange={(e) => onCultivarChange(e.target.value)}
          className={inputClass}
          placeholder="Select or type cultivar..."
        />
        <datalist id="plant-cultivar-options">
          {filteredCultivars.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name} ({c.code})
            </option>
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Qty</label>
          <input
            type="number"
            name="qty"
            min={1}
            defaultValue={1}
            className={inputClass}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Cost ($)</label>
          <input
            type="number"
            name="cost"
            step="0.01"
            min={0}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">MSRP ($)</label>
        <input
          type="number"
          name="msrp"
          step="0.01"
          min={0}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">ID #</label>
          <input
            type="text"
            name="locationCode"
            list="plant-id-options"
            value={idCode}
            onChange={(e) => onIdChange(e.target.value)}
            className={inputClass}
            placeholder="Select or type ID..."
          />
          <datalist id="plant-id-options">
            {plantIds.map((p) => (
              <option key={p.id} value={p.code}>
                {p.code}
              </option>
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">Pot type</label>
          <input
            type="text"
            name="potType"
            className={inputClass}
            placeholder="e.g. ST-PO-6-NU-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-700">
            Payment method
          </label>
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
          <label className="text-sm font-medium text-gray-700">
            Card last 4
          </label>
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
        <label className="text-sm font-medium text-gray-700">
          Location / Status
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            name="location"
            placeholder="Location"
            className={inputClass}
          />
          <select name="status" className={selectClass}>
            <option value="">Status...</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Add plant
        </button>
        <Link
          href={`/app/${businessSlug}/plant-intake`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
