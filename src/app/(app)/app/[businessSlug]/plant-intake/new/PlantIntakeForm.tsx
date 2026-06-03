"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Camera, ChevronDown, Minus, Plus, X } from "lucide-react";
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

  const [qty, setQty] = useState("0");
  const [totalCost, setTotalCost] = useState("$ 0.00");
  const [msrp, setMsrp] = useState("$ 0.00");

  function todayInputValue() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function currencyValue(value: string) {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatCurrency(value: number) {
    return `$ ${Math.max(0, value).toFixed(2)}`;
  }

  function adjustQty(delta: number) {
    const parsed = Number.parseInt(qty, 10);
    const next = Math.max(0, (Number.isFinite(parsed) ? parsed : 0) + delta);
    setQty(String(next));
  }

  function adjustCurrency(
    value: string,
    setValue: (next: string) => void,
    delta: number
  ) {
    setValue(formatCurrency(currencyValue(value) + delta));
  }

  return (
    <form action={action} className="min-h-[calc(100vh-3.5rem)] bg-white">
      <div className="flex h-[60px] items-center justify-between border-b border-transparent px-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/app/${businessSlug}/plant-intake`}
            className="inline-flex h-6 w-6 items-center justify-center text-gray-600 hover:text-gray-900"
            aria-label="Close plant intake form"
          >
            <X className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-normal text-gray-900">
            Plant Intake Form
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/${businessSlug}/plant-intake`}
            className="inline-flex h-8 items-center rounded-sm border border-[#08bd12] bg-white px-3 text-base text-[#08bd12] hover:bg-green-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex h-8 items-center rounded-sm bg-[#08bd12] px-4 text-base font-medium text-white hover:bg-[#08aa12]"
          >
            Save
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[560px] gap-y-[25px] pt-7">
        <FormRow label="Date">
          <input
            type="date"
            name="date"
            defaultValue={todayInputValue()}
            className={fieldClass}
          />
        </FormRow>

        <DatalistRow
          label="Source"
          name="source"
          listId="plant-source-options"
          required
        />

        <DatalistRow
          label="Genus"
          name="genus"
          listId="plant-genus-options"
          required
        />

        <DatalistRow
          label="Cultivar"
          name="cultivar"
          listId="plant-cultivar-options"
          required
        />

        <DatalistRow
          label="ID #"
          name="locationCode"
          listId="plant-id-options"
          required
        />

        <FormRow label="QTY" required>
          <StepperShell>
            <input
              name="qty"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              inputMode="numeric"
              required
              className={stepperInputClass}
            />
            <StepperButtons
              onDecrement={() => adjustQty(-1)}
              onIncrement={() => adjustQty(1)}
            />
          </StepperShell>
        </FormRow>

        <FormRow label="Total Cost" required>
          <StepperShell>
            <input
              name="cost"
              value={totalCost}
              onChange={(event) => setTotalCost(event.target.value)}
              onBlur={() => setTotalCost(formatCurrency(currencyValue(totalCost)))}
              inputMode="decimal"
              required
              className={stepperInputClass}
            />
            <StepperButtons
              onDecrement={() => adjustCurrency(totalCost, setTotalCost, -1)}
              onIncrement={() => adjustCurrency(totalCost, setTotalCost, 1)}
            />
          </StepperShell>
        </FormRow>

        <FormRow label="MSRP" required>
          <StepperShell>
            <input
              name="msrp"
              value={msrp}
              onChange={(event) => setMsrp(event.target.value)}
              onBlur={() => setMsrp(formatCurrency(currencyValue(msrp)))}
              inputMode="decimal"
              required
              className={stepperInputClass}
            />
            <StepperButtons
              onDecrement={() => adjustCurrency(msrp, setMsrp, -1)}
              onIncrement={() => adjustCurrency(msrp, setMsrp, 1)}
            />
          </StepperShell>
        </FormRow>

        <TextChevronRow label="Pot Type" name="potType" required />

        <SelectRow
          label="Payment Method"
          name="paymentMethod"
          options={paymentMethods}
        />

        <TextChevronRow label="Card Number" name="cardLast4" maxLength={4} />

        <FormRow label="Photo">
          <button
            type="button"
            className="flex h-[68px] w-full items-center justify-center rounded-sm border border-gray-300 bg-white text-gray-600"
            aria-label="Add photo"
          >
            <Camera className="h-6 w-6" />
          </button>
        </FormRow>

        <datalist id="plant-source-options">
          {sources.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name} ({item.code})
            </option>
          ))}
        </datalist>
        <datalist id="plant-genus-options">
          {genera.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name} ({item.code})
            </option>
          ))}
        </datalist>
        <datalist id="plant-cultivar-options">
          {cultivars.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name} ({item.code})
            </option>
          ))}
        </datalist>
        <datalist id="plant-id-options">
          {plantIds.map((item) => (
            <option key={item.id} value={item.code}>
              {item.code}
            </option>
          ))}
        </datalist>
      </div>
    </form>
  );
}

const fieldClass =
  "h-12 w-full rounded-sm border border-gray-300 bg-white px-3 text-lg text-gray-900 outline-none focus:border-[#08bd12] focus:ring-1 focus:ring-[#08bd12]";

const stepperInputClass =
  "h-full min-w-0 flex-1 bg-transparent px-3 text-lg text-gray-900 outline-none";

function FormRow({
  children,
  label,
  required = false,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-7">
      <span className="text-sm text-gray-600">
        {label}
        {required ? <span className="text-[#08bd12]">*</span> : null}
      </span>
      {children}
    </div>
  );
}

function DatalistRow({
  label,
  name,
  listId,
  required = false,
}: {
  label: string;
  name: string;
  listId: string;
  required?: boolean;
}) {
  return (
    <FormRow label={label} required={required}>
      <div className="relative">
        <input
          type="text"
          name={name}
          list={listId}
          required={required}
          className={`${fieldClass} pr-10`}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>
    </FormRow>
  );
}

function TextChevronRow({
  label,
  name,
  maxLength,
  required = false,
}: {
  label: string;
  name: string;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <FormRow label={label} required={required}>
      <div className="relative">
        <input
          type="text"
          name={name}
          maxLength={maxLength}
          required={required}
          className={`${fieldClass} pr-10`}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>
    </FormRow>
  );
}

function SelectRow({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: LookupRow[];
}) {
  return (
    <FormRow label={label}>
      <div className="relative">
        <select
          name={name}
          className={`${fieldClass} appearance-none pr-10`}
          defaultValue=""
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
    </FormRow>
  );
}

function StepperShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-full items-center rounded-sm border border-gray-300 bg-white focus-within:border-[#08bd12] focus-within:ring-1 focus-within:ring-[#08bd12]">
      {children}
    </div>
  );
}

function StepperButtons({
  onDecrement,
  onIncrement,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex h-full items-center gap-3 px-4 text-gray-600">
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
