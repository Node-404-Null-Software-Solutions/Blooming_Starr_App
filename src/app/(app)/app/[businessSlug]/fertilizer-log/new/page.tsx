import { redirect } from "next/navigation";
import { requireBusinessMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAllFertilizerProducts } from "@/lib/fertilizer-key";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import { createFertilizerLog } from "@/lib/actions/data-entries";
import FertilizerLogForm from "./FertilizerLogForm";

export default async function NewFertilizerLogPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { business } = await requireBusinessMembership(businessSlug);
  const businessId = business.id;

  const [lookups, plantSkus] = await Promise.all([
    getLookupEntriesMulti(businessSlug, ["fertilizerProduct", "potSize"]),
    db.plantIntake.findMany({
      where: { businessId },
      select: { sku: true },
      orderBy: { sku: "asc" },
      distinct: ["sku"],
    }),
  ]);

  const productOptions = Array.from(
    new Set([
      ...(lookups.fertilizerProduct?.map((entry) => entry.name) ?? []),
      ...getAllFertilizerProducts(),
    ]),
  );
  const potSizeOptions = lookups.potSize?.map((entry) => entry.name) ?? [];
  const skuList = plantSkus.map((plant) => plant.sku);

  async function submit(formData: FormData): Promise<void> {
    "use server";
    const res = await createFertilizerLog(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/fertilizer-log`);
  }

  return (
    <FertilizerLogForm
      businessSlug={businessSlug}
      action={submit as (fd: FormData) => Promise<void>}
      skuList={skuList}
      potSizeOptions={potSizeOptions}
      productOptions={productOptions}
    />
  );
}
