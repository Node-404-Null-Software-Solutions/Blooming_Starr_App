import { redirect } from "next/navigation";
import { requireBusinessMembership } from "@/lib/authz";
import { createOverheadExpense } from "@/lib/actions/data-entries";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import {
  PlantStyleAddFormBody,
  PlantStyleAddFormHeader,
  PlantStyleAddFormShell,
  PlantStyleSelectRow,
  PlantStyleTextareaRow,
  PlantStyleTextInputRow,
} from "../../_components/PlantStyleAddForm";

export default async function NewOverheadExpensePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  await requireBusinessMembership(businessSlug);

  const lookups = await getLookupEntriesMulti(businessSlug, ["paymentMethod"]);
  const paymentMethods = lookups.paymentMethod ?? [];

  async function submit(formData: FormData): Promise<void> {
    "use server";
    const res = await createOverheadExpense(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/overhead-expenses`);
  }

  const backHref = `/app/${businessSlug}/overhead-expenses`;

  return (
    <PlantStyleAddFormShell action={submit as (fd: FormData) => Promise<void>}>
      <PlantStyleAddFormHeader
        backHref={backHref}
        backLabel="Close overhead expense form"
        title="Overhead Expense Form"
      />

      <PlantStyleAddFormBody>
        <PlantStyleTextInputRow
          id="overhead-date"
          label="Date"
          type="date"
          name="date"
        />
        <PlantStyleTextInputRow
          id="overhead-vendor"
          label="Vendor"
          type="text"
          name="vendor"
          placeholder="e.g. Supply Co"
        />
        <PlantStyleTextInputRow
          id="overhead-brand"
          label="Brand"
          type="text"
          name="brand"
          placeholder="e.g. Barrina, Legigo"
        />
        <PlantStyleTextInputRow
          id="overhead-category"
          label="Category"
          type="text"
          name="category"
          placeholder="e.g. Supplies, Utilities"
        />
        <PlantStyleTextInputRow
          id="overhead-description"
          label="Description"
          type="text"
          name="description"
          placeholder="e.g. Potting mix, 50 lb"
        />
        <PlantStyleTextInputRow
          id="overhead-qty"
          label="Qty"
          type="number"
          name="qty"
          min={1}
          defaultValue={1}
        />
        <PlantStyleTextInputRow
          id="overhead-subtotal"
          label="Subtotal ($)"
          type="number"
          name="subTotal"
          step="0.01"
          min={0}
          required
          placeholder="0.00"
        />
        <PlantStyleTextInputRow
          id="overhead-shipping"
          label="Shipping ($)"
          type="number"
          name="shipping"
          step="0.01"
          min={0}
          defaultValue={0}
          placeholder="0.00"
        />
        <PlantStyleTextInputRow
          id="overhead-discount"
          label="Discount ($)"
          type="number"
          name="discount"
          step="0.01"
          min={0}
          defaultValue={0}
          placeholder="0.00"
        />
        <PlantStyleSelectRow
          id="overhead-payment-method"
          label="Payment method"
          name="paymentMethod"
          options={paymentMethods}
        />
        <PlantStyleTextInputRow
          id="overhead-card-last-4"
          label="Card last 4"
          type="text"
          name="cardLast4"
          maxLength={4}
          placeholder="e.g. 1002"
        />
        <PlantStyleTextInputRow
          id="overhead-invoice-number"
          label="Invoice number"
          type="text"
          name="invoiceNumber"
          placeholder="e.g. INV-001"
        />
        <PlantStyleTextareaRow
          id="overhead-notes"
          label="Notes / Project"
          name="notes"
          rows={3}
          placeholder="Optional notes or project code"
        />
      </PlantStyleAddFormBody>
    </PlantStyleAddFormShell>
  );
}
