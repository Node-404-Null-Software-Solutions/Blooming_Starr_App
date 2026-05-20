import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import { createTransplantLog } from "@/lib/actions/data-entries";
import ModuleHeader from "../../_components/ModuleHeader";
import TransplantLogForm from "./TransplantLogForm";

export default async function NewTransplantLogPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { profile } = await requireActiveMembership();
  const { businessSlug } = await params;
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  const [lookups, plantSkus] = await Promise.all([
    getLookupEntriesMulti([
      "transplantAction",
      "transplantMedia",
      "potSize",
      "potColor",
    ]),
    db.plantIntake.findMany({
      where: { businessId },
      select: { sku: true },
      orderBy: { sku: "asc" },
      distinct: ["sku"],
    }),
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
    <div className="space-y-6">
      <ModuleHeader
        title="Add transplant log"
        addHref={`/app/${businessSlug}/transplant-log/new`}
      />
      <div className="rounded-md border border-gray-200 bg-white p-6">
        <TransplantLogForm
          businessSlug={businessSlug}
          action={submit as (fd: FormData) => Promise<void>}
          skuList={skuList}
          actionOptions={actionOptions}
          mediaOptions={mediaOptions}
          potSizeOptions={potSizeOptions}
          potColorOptions={potColorOptions}
        />
      </div>
    </div>
  );
}
