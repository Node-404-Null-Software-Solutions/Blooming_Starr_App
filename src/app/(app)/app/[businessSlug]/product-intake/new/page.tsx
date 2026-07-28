import { requireBusinessOperationManager } from "@/lib/authz";
import { createProductIntake } from "@/lib/actions/data-entries";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import ProductIntakeForm from "./ProductIntakeForm";

export default async function NewProductIntakePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  await requireBusinessOperationManager(businessSlug);

  const lookups = await getLookupEntriesMulti(businessSlug, [
    "productSource",
    "productCategory",
    "productSize",
    "productStyle",
    "paymentMethod",
  ]);

  async function submit(formData: FormData) {
    "use server";
    return createProductIntake(businessSlug, formData);
  }

  return (
    <ProductIntakeForm
      businessSlug={businessSlug}
      action={submit}
      lookups={lookups}
    />
  );
}
