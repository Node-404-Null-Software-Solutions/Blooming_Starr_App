import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { createOverheadExpense } from "@/lib/actions/data-entries";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import ModuleHeader from "../../_components/ModuleHeader";

export default async function NewOverheadExpensePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { profile } = await requireActiveMembership();
  const { businessSlug } = await params;
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  const lookups = await getLookupEntriesMulti(["paymentMethod"]);
  const paymentMethods = lookups.paymentMethod ?? [];

  async function submit(formData: FormData): Promise<void> {
    "use server";
    const res = await createOverheadExpense(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/overhead-expenses`);
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Add overhead expense"
        importHref={`/app/${businessSlug}/overhead-expenses/import`}
        addHref={`/app/${businessSlug}/overhead-expenses/new`}
      />
      <div className="rounded-md border border-gray-200 bg-white p-6">
        <form action={submit as (fd: FormData) => Promise<void>} className="flex max-w-xl flex-col gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              name="date"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Vendor</label>
              <input
                type="text"
                name="vendor"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Supply Co"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Brand</label>
              <input
                type="text"
                name="brand"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Barrina, Legigo"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              name="category"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Supplies, Utilities"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              name="description"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Potting mix, 50 lb"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Qty</label>
              <input
                type="number"
                name="qty"
                min={1}
                defaultValue={1}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Subtotal ($)</label>
              <input
                type="number"
                name="subTotal"
                step="0.01"
                min={0}
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Shipping ($)</label>
              <input
                type="number"
                name="shipping"
                step="0.01"
                min={0}
                defaultValue={0}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Discount ($)</label>
              <input
                type="number"
                name="discount"
                step="0.01"
                min={0}
                defaultValue={0}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Payment method</label>
              <select
                name="paymentMethod"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select...</option>
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Card last 4</label>
              <input
                type="text"
                name="cardLast4"
                maxLength={4}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. 1002"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Invoice number</label>
            <input
              type="text"
              name="invoiceNumber"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. INV-001"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Notes / Project</label>
            <textarea
              name="notes"
              rows={2}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Optional notes or project code"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Add expense
            </button>
            <Link
              href={`/app/${businessSlug}/overhead-expenses`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
