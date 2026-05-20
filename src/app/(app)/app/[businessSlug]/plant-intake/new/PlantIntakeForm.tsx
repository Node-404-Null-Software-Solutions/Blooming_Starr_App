"use client";

import { useState } from "react";
import Link from "next/link";
import type { LookupRow } from "@/lib/actions/lookups";

type Props = {
  businessSlug: string;
  action: (fd: FormData) => Promise<void>;
  lookups: Record<string, LookupRow[]>;
};

export default function PlantIntakeForm({ businessSlug, action, lookups }: Props) {
  const sources = lookups.plantSource ?? [];
  const genera = lookups.genus ?? [];
  const cultivars = lookups.cultivar ?? [];
  const plantIds = lookups.plantId ?? [];
  const paymentMethods = lookups.paymentMethod ?? [];
  const statuses = lookups.status ?? [];

  const [sourceName, setSourceName] = useState("");
  const [genusName, setGenusName] = useState("");
  const [cultivarName, setCultivarName] = useState("");
  const [idCode, setIdCode] = useState("");

  function onSourceChange(value: string) {
    setSourceName(value);
  }

  function onGenusChange(value: string) {
    setGenusName(value);
    setCultivarName("");
  }

  function onCultivarChange(value: string) {
    setCultivarName(value);
  }

  function onIdChange(value: string) {
    setIdCode(value);
  }


  const filteredCultivars = cultivars;

  const selectClass =
    "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white";
  const inputClass = "rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-gray-700">Date</label>
        <input type="date" name="date" className={inputClass} />
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
