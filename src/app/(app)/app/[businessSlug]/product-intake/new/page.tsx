import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { createProductIntake } from "@/lib/actions/data-entries";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import ProductIntakeForm from "./ProductIntakeForm";

export default async function NewProductIntakePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { profile } = await requireActiveMembership();
  const { businessSlug } = await params;
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  const lookups = await getLookupEntriesMulti([
    "productSource",
    "productCategory",
    "productSize",
    "productStyle",
    "paymentMethod",
  ]);

  async function submit(formData: FormData): Promise<void> {
    "use server";
    const res = await createProductIntake(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/product-intake`);
  }

  return (
    <ProductIntakeForm
      businessSlug={businessSlug}
      action={submit as (fd: FormData) => Promise<void>}
      lookups={lookups}
    />
  );
}
