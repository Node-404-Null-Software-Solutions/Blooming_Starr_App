"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, X } from "lucide-react";
import {
  FormRow,
  ScannableDatalistRow,
  logFormFieldClass,
  todayInputValue,
} from "../../_components/LogFormLayout";

type FertilizerLogFormProps = {
  businessSlug: string;
  action: (fd: FormData) => Promise<void>;
  skuList: string[];
  potSizeOptions: string[];
  productOptions: string[];
};

export default function FertilizerLogForm({
  businessSlug,
  action,
  skuList,
  potSizeOptions,
  productOptions,
}: FertilizerLogFormProps) {
  const [plantSku, setPlantSku] = useState("");
  const [potSku, setPotSku] = useState("");
  const backHref = `/app/${businessSlug}/fertilizer-log`;

  return (
    <form action={action} className="min-h-[calc(100vh-3.5rem)] bg-white">
      <div className="flex h-[60px] items-center justify-between border-b border-transparent px-4">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="inline-flex h-6 w-6 items-center justify-center text-gray-600 hover:text-gray-900"
            aria-label="Close fertilizer log form"
          >
            <X className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-normal text-gray-900">
            Fertilizer Log Form
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
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
        <FormRow label="Date" htmlFor="fertilizer-date">
          <input
            id="fertilizer-date"
            type="date"
            name="date"
            defaultValue={todayInputValue()}
            className={logFormFieldClass}
          />
        </FormRow>

        <ScannableDatalistRow
          label="Plant SKU"
          name="plantSku"
          value={plantSku}
          onChange={setPlantSku}
          listId={skuList.length > 0 ? "fertilizer-plant-sku-options" : undefined}
          placeholder="Select or scan a SKU"
        />

        <ScannableDatalistRow
          label="Pot Size"
          name="potSku"
          value={potSku}
          onChange={setPotSku}
          listId={potSizeOptions.length > 0 ? "fertilizer-pot-size-options" : undefined}
          placeholder="Select or scan a pot size"
        />

        <DatalistRow
          label="Product"
          name="product"
          listId={productOptions.length > 0 ? "fertilizer-product-options" : undefined}
          placeholder="e.g. 20-20-20, Fish emulsion"
        />

        <FormRow label="Method" htmlFor="fertilizer-method">
          <input
            id="fertilizer-method"
            type="text"
            name="method"
            className={logFormFieldClass}
            placeholder="e.g. Foliar, Drench"
          />
        </FormRow>

        <FormRow label="Rate" htmlFor="fertilizer-rate">
          <input
            id="fertilizer-rate"
            type="text"
            name="rate"
            className={logFormFieldClass}
            placeholder="e.g. 1 tsp/gal"
          />
        </FormRow>

        <FormRow label="Unit" htmlFor="fertilizer-unit">
          <input
            id="fertilizer-unit"
            type="text"
            name="unit"
            className={logFormFieldClass}
            placeholder="e.g. 32 oz, 1 gal"
          />
        </FormRow>

        <FormRow label="Notes" htmlFor="fertilizer-notes" alignStart>
          <textarea
            id="fertilizer-notes"
            name="notes"
            rows={3}
            className={`${logFormFieldClass} min-h-24 py-3`}
            placeholder="Optional notes"
          />
        </FormRow>

        {skuList.length > 0 ? (
          <datalist id="fertilizer-plant-sku-options">
            {skuList.map((sku) => (
              <option key={sku} value={sku} />
            ))}
          </datalist>
        ) : null}
        {potSizeOptions.length > 0 ? (
          <datalist id="fertilizer-pot-size-options">
            {potSizeOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        ) : null}
        {productOptions.length > 0 ? (
          <datalist id="fertilizer-product-options">
            {productOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        ) : null}
      </div>
    </form>
  );
}

function DatalistRow({
  label,
  name,
  listId,
  placeholder,
}: {
  label: string;
  name: string;
  listId?: string;
  placeholder?: string;
}) {
  const id = `fertilizer-${name}`;

  return (
    <FormRow label={label} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type="text"
          name={name}
          list={listId}
          className={`${logFormFieldClass} pr-10`}
          placeholder={placeholder}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>
    </FormRow>
  );
}
