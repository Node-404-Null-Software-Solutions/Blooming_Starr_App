"use client";

import { useState } from "react";
import {
  PlantStyleAddFormBody,
  PlantStyleAddFormHeader,
  PlantStyleAddFormShell,
  PlantStyleTextareaRow,
  PlantStyleTextInputRow,
} from "../../_components/PlantStyleAddForm";
import {
  ScannableDatalistRow,
  ScannableSelectOrInputRow,
  SelectOrInputRow,
  todayInputValue,
} from "../../_components/LogFormLayout";

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
  const backHref = `/app/${businessSlug}/transplant-log`;

  return (
    <PlantStyleAddFormShell action={action}>
      <PlantStyleAddFormHeader
        backHref={backHref}
        backLabel="Close transplant log form"
        title="Transplant Log Form"
      />

      <PlantStyleAddFormBody>
        <PlantStyleTextInputRow
          id="transplant-date"
          label="Date"
          type="date"
          name="date"
          defaultValue={todayInputValue()}
        />

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

        <PlantStyleTextInputRow
          id="transplant-id"
          label="ID"
          type="text"
          name="idCode"
          placeholder="Optional"
        />

        <PlantStyleTextInputRow
          id="transplant-new-sku"
          label="New SKU"
          type="text"
          name="divisionSku"
          placeholder="Optional"
        />

        <SelectOrInputRow
          label="Pot color"
          name="potColor"
          options={potColorOptions}
          placeholder="e.g. Black, White"
        />

        <PlantStyleTextareaRow
          id="transplant-notes"
          label="Notes"
          name="notes"
          rows={3}
          placeholder="Optional notes"
        />

        {skuList.length > 0 ? (
          <datalist id="transplant-original-sku-options">
            {skuList.map((sku) => (
              <option key={sku} value={sku} />
            ))}
          </datalist>
        ) : null}
      </PlantStyleAddFormBody>
    </PlantStyleAddFormShell>
  );
}
