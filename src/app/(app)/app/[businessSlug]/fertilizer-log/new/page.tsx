import { requireBusinessOperationManager } from "@/lib/authz";
import { getAllFertilizerProducts } from "@/lib/fertilizer-key";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import { createFertilizerLog } from "@/lib/actions/data-entries";
import { createPlantIntakeRepository } from "@/lib/repositories/plant-intake";
import FertilizerLogForm from "./FertilizerLogForm";

export default async function NewFertilizerLogPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } =
    await requireBusinessOperationManager(businessSlug);
  const plantIntakes = createPlantIntakeRepository(businessContext);

  const [lookups, plantSkus] = await Promise.all([
    getLookupEntriesMulti(businessSlug, ["fertilizerProduct", "potSize"]),
    plantIntakes.listDistinctSkus(),
  ]);

  const productOptions = Array.from(
    new Set([
      ...(lookups.fertilizerProduct?.map((entry) => entry.name) ?? []),
      ...getAllFertilizerProducts(),
    ]),
  );
  const potSizeOptions = lookups.potSize?.map((entry) => entry.name) ?? [];
  const skuList = plantSkus.map((plant) => plant.sku);

  async function submit(formData: FormData) {
    "use server";
    return createFertilizerLog(businessSlug, formData);
  }

  return (
    <FertilizerLogForm
      businessSlug={businessSlug}
      action={submit}
      skuList={skuList}
      potSizeOptions={potSizeOptions}
      productOptions={productOptions}
    />
  );
}
