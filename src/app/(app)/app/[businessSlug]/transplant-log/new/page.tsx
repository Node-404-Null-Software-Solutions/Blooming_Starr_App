import { redirect } from "next/navigation";
import { requireBusinessMembership } from "@/lib/authz";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import { createTransplantLog } from "@/lib/actions/data-entries";
import { createPlantIntakeRepository } from "@/lib/repositories/plant-intake";
import TransplantLogForm from "./TransplantLogForm";

export default async function NewTransplantLogPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const plantIntakes = createPlantIntakeRepository(businessContext);

  const [lookups, plantSkus] = await Promise.all([
    getLookupEntriesMulti(businessSlug, [
      "transplantAction",
      "transplantMedia",
      "potSize",
      "potColor",
    ]),
    plantIntakes.listDistinctSkus(),
  ]);

  const actionOptions = lookups.transplantAction?.map((entry) => entry.name) ?? [];
  const mediaOptions = lookups.transplantMedia?.map((entry) => entry.name) ?? [];
  const potSizeOptions = lookups.potSize?.map((entry) => entry.name) ?? [];
  const potColorOptions = lookups.potColor?.map((entry) => entry.name) ?? [];
  const skuList = plantSkus.map((plant) => plant.sku);

  async function submit(formData: FormData): Promise<void> {
    "use server";
    const res = await createTransplantLog(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/transplant-log`);
  }

  return (
    <TransplantLogForm
      businessSlug={businessSlug}
      action={submit as (fd: FormData) => Promise<void>}
      skuList={skuList}
      actionOptions={actionOptions}
      mediaOptions={mediaOptions}
      potSizeOptions={potSizeOptions}
      potColorOptions={potColorOptions}
    />
  );
}
