"use client";

import { FlaskConical } from "lucide-react";
import {
  FormRow,
  LogFormBody,
  LogFormFieldGroup,
  LogFormFooter,
  LogFormHeader,
  LogFormShell,
  logFormFieldClass,
} from "../../_components/LogFormLayout";

type FertilizerLogFormProps = {
  businessSlug: string;
  action: (fd: FormData) => Promise<void>;
};

export default function FertilizerLogForm({
  businessSlug,
  action,
}: FertilizerLogFormProps) {
  const backHref = `/app/${businessSlug}/fertilizer-log`;

  return (
    <LogFormShell action={action}>
      <LogFormHeader
        backHref={backHref}
        backLabel="Back to fertilizer log"
        icon={<FlaskConical className="h-5 w-5 text-[#08bd12]" />}
        title="Fertilizer Log Form"
      />

      <LogFormBody>
        <FormRow label="Date" htmlFor="fertilizer-date">
          <input
            id="fertilizer-date"
            type="date"
            name="date"
            className={logFormFieldClass}
          />
        </FormRow>

        <FormRow label="Plant SKU" htmlFor="fertilizer-plant-sku">
          <LogFormFieldGroup>
            <input
              id="fertilizer-plant-sku"
              type="text"
              name="plantSku"
              className={logFormFieldClass}
              placeholder="e.g. HS-BE-AW-1A"
            />
            <HiddenLabelInput
              id="fertilizer-pot-sku"
              label="Pot SKU"
              name="potSku"
              placeholder="e.g. POT-4-BLK"
            />
          </LogFormFieldGroup>
        </FormRow>

        <FormRow label="Product" htmlFor="fertilizer-product">
          <input
            id="fertilizer-product"
            type="text"
            name="product"
            className={logFormFieldClass}
            placeholder="e.g. 20-20-20, Fish emulsion"
          />
        </FormRow>

        <FormRow label="Method" htmlFor="fertilizer-method">
          <LogFormFieldGroup>
            <input
              id="fertilizer-method"
              type="text"
              name="method"
              className={logFormFieldClass}
              placeholder="e.g. Foliar, Drench"
            />
            <HiddenLabelInput
              id="fertilizer-rate"
              label="Rate"
              name="rate"
              placeholder="e.g. 1 tsp/gal"
            />
          </LogFormFieldGroup>
        </FormRow>

        <FormRow label="Unit" htmlFor="fertilizer-unit">
          <LogFormFieldGroup columns={3}>
            <input
              id="fertilizer-unit"
              type="text"
              name="unit"
              className={logFormFieldClass}
              placeholder="e.g. 32 oz, 1 gal"
            />
            <HiddenLabelInput
              id="fertilizer-next-earliest"
              label="Next earliest"
              name="nextEarliest"
              type="date"
            />
            <HiddenLabelInput
              id="fertilizer-next-latest"
              label="Next latest"
              name="nextLatest"
              type="date"
            />
          </LogFormFieldGroup>
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
      </LogFormBody>

      <LogFormFooter cancelHref={backHref} />
    </LogFormShell>
  );
}

function HiddenLabelInput({
  id,
  label,
  name,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={type}
        name={name}
        className={logFormFieldClass}
        placeholder={placeholder}
      />
    </div>
  );
}
