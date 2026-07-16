import { redirect } from "next/navigation";
import { requireBusinessMembership } from "@/lib/authz";
import { createProductIntake } from "@/lib/actions/data-entries";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import ProductIntakeForm from "./ProductIntakeForm";

export default async function NewProductIntakePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  await requireBusinessMembership(businessSlug);

  const lookups = await getLookupEntriesMulti(businessSlug, [
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
