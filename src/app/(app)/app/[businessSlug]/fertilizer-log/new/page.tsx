import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { createFertilizerLog } from "@/lib/actions/data-entries";
import FertilizerLogForm from "./FertilizerLogForm";

export default async function NewFertilizerLogPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { profile } = await requireActiveMembership();
  const { businessSlug } = await params;
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  async function submit(formData: FormData): Promise<void> {
    "use server";
    const res = await createFertilizerLog(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/fertilizer-log`);
  }

  return (
    <FertilizerLogForm
      businessSlug={businessSlug}
      action={submit as (fd: FormData) => Promise<void>}
    />
  );
}
