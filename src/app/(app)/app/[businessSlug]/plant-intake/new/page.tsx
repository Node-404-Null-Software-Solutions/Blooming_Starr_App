import { requireBusinessOperationManager } from "@/lib/authz";
import { createPlantIntake } from "@/lib/actions/data-entries";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import PlantIntakeForm from "./PlantIntakeForm";

export default async function NewPlantIntakePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  await requireBusinessOperationManager(businessSlug);

  const lookups = await getLookupEntriesMulti(businessSlug, [
    "plantSource",
    "genus",
    "cultivar",
    "plantId",
    "paymentMethod",
    "status",
  ]);

  async function submit(formData: FormData) {
    "use server";
    return createPlantIntake(businessSlug, formData);
  }

  return (
    <PlantIntakeForm
      businessSlug={businessSlug}
      action={submit}
      lookups={lookups}
    />
  );
}
