"use client";

import Image from "next/image";
import { useState } from "react";
import { Sprout } from "lucide-react";
import {
  FormRow,
  LogFormBody,
  LogFormFooter,
  LogFormHeader,
  LogFormShell,
  ScannableDatalistRow,
  ScannableSelectOrInputRow,
  SelectOrInputRow,
  logFormFieldClass,
  todayInputValue,
} from "../../_components/LogFormLayout";

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
  const backHref = `/app/${businessSlug}/transplant-log`;

  return (
    <LogFormShell action={action}>
      <LogFormHeader
        backHref={backHref}
        backLabel="Back to transplant log"
        icon={
          logoUrl ? (
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
          )
        }
        title="Transplant Log Form"
        srLabel={businessName ?? "Blooming Starr"}
      />

      <LogFormBody>
        <FormRow label="Date">
          <input
            type="date"
            name="date"
            defaultValue={todayInputValue()}
            className={logFormFieldClass}
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
            className={logFormFieldClass}
            placeholder="Optional"
          />
        </FormRow>

        <FormRow label="New SKU">
          <input
            type="text"
            name="divisionSku"
            className={logFormFieldClass}
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
            className={`${logFormFieldClass} min-h-24 py-3`}
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
      </LogFormBody>

      <LogFormFooter cancelHref={backHref} />
    </LogFormShell>
  );
}
