import { redirect } from "next/navigation";
import { requireBusinessMembership } from "@/lib/authz";
import { createPlantIntake } from "@/lib/actions/data-entries";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import PlantIntakeForm from "./PlantIntakeForm";

export default async function NewPlantIntakePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  await requireBusinessMembership(businessSlug);

  const lookups = await getLookupEntriesMulti(businessSlug, [
    "plantSource",
    "genus",
    "cultivar",
    "plantId",
    "paymentMethod",
    "status",
  ]);

  async function submit(formData: FormData): Promise<void> {
    "use server";
    const res = await createPlantIntake(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/plant-intake`);
  }

  return (
    <PlantIntakeForm
      businessSlug={businessSlug}
      action={submit as (fd: FormData) => Promise<void>}
      lookups={lookups}
    />
  );
}
