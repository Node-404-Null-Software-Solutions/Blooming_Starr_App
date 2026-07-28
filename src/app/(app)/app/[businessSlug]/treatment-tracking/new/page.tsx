import { requireBusinessOperationManager } from "@/lib/authz";
import { createTreatmentTracking } from "@/lib/actions/data-entries";
import {
  PlantStyleAddFormBody,
  PlantStyleAddFormHeader,
  PlantStyleAddFormShell,
  PlantStyleTextareaRow,
  PlantStyleTextInputRow,
} from "../../_components/PlantStyleAddForm";

export default async function NewTreatmentTrackingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  await requireBusinessOperationManager(businessSlug);

  async function submit(formData: FormData) {
    "use server";
    return createTreatmentTracking(businessSlug, formData);
  }

  const backHref = `/app/${businessSlug}/treatment-tracking`;

  return (
    <PlantStyleAddFormShell action={submit} successHref={backHref}>
      <PlantStyleAddFormHeader
        backHref={backHref}
        backLabel="Close treatment tracking form"
        title="Treatment Tracking Form"
      />

      <PlantStyleAddFormBody>
        <PlantStyleTextInputRow
          id="treatment-date"
          label="Date"
          type="date"
          name="date"
        />
        <PlantStyleTextInputRow
          id="treatment-sku"
          label="SKU"
          type="text"
          name="sku"
          required
          placeholder="e.g. HS-BE-AW-1A"
        />
        <PlantStyleTextInputRow
          id="treatment-target"
          label="Target"
          type="text"
          name="target"
          placeholder="e.g. Aphids, Mites"
        />
        <PlantStyleTextInputRow
          id="treatment-product"
          label="Product"
          type="text"
          name="product"
          placeholder="e.g. Insecticidal soap"
        />
        <PlantStyleTextInputRow
          id="treatment-active-ingredient"
          label="Active ingredient"
          type="text"
          name="activeIngredient"
          placeholder="e.g. Spinosad"
        />
        <PlantStyleTextInputRow
          id="treatment-epa-number"
          label="EPA #"
          type="text"
          name="epaNumber"
          placeholder="e.g. 53883-217-4"
        />
        <PlantStyleTextInputRow
          id="treatment-rate"
          label="Rate"
          type="text"
          name="rate"
          placeholder="e.g. 2 tbsp/gal"
        />
        <PlantStyleTextInputRow
          id="treatment-pot-size"
          label="Pot size"
          type="text"
          name="potSize"
          placeholder={'e.g. 4"'}
        />
        <PlantStyleTextInputRow
          id="treatment-method"
          label="Method"
          type="text"
          name="method"
          placeholder="e.g. Foliar, Drench"
        />
        <PlantStyleTextInputRow
          id="treatment-initials"
          label="Initials"
          type="text"
          name="initials"
          placeholder="Who applied"
        />
        <PlantStyleTextInputRow
          id="treatment-next-earliest"
          label="Next earliest"
          type="date"
          name="nextEarliest"
        />
        <PlantStyleTextInputRow
          id="treatment-next-latest"
          label="Next latest"
          type="date"
          name="nextLatest"
        />
        <PlantStyleTextareaRow
          id="treatment-notes"
          label="Notes"
          name="notes"
          rows={3}
          placeholder="Optional notes"
        />
      </PlantStyleAddFormBody>
    </PlantStyleAddFormShell>
  );
}
