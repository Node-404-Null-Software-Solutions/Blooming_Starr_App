import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { createSalesEntry } from "@/lib/actions/data-entries";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import ModuleHeader from "../../_components/ModuleHeader";

export default async function NewSalesEntryPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { profile } = await requireActiveMembership();
  const { businessSlug } = await params;
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  const lookups = await getLookupEntriesMulti(["salesChannel", "paymentMethod"]);
  const salesChannels = lookups.salesChannel ?? [];
  const paymentMethods = lookups.paymentMethod ?? [];

  async function submit(formData: FormData): Promise<void> {
    "use server";
    const res = await createSalesEntry(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/sales`);
  }

  const selectClass =
    "rounded-md border border-gray-300 px-3 py-2 text-sm bg-white";
  const inputClass = "rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Add sale"
        addHref={`/app/${businessSlug}/sales/new`}
      />
      <div className="rounded-md border border-gray-200 bg-white p-6">
        <form action={submit as (fd: FormData) => Promise<void>} className="flex max-w-xl flex-col gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Date *</label>
            <input
              type="date"
              name="date"
              required
              className={inputClass}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">SKU *</label>
            <input
              type="text"
              name="sku"
              required
              className={inputClass}
              placeholder="e.g. HS-BE-AW-1A"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Item name</label>
            <input
              type="text"
              name="itemName"
              className={inputClass}
              placeholder="e.g. Begonia Angel Wing 4&quot;"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Qty *</label>
              <input
                type="number"
                name="qty"
                min={1}
                defaultValue={1}
                required
                className={inputClass}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Sale price ($) *</label>
              <input
                type="number"
                name="salePrice"
                step="0.01"
                min={0}
                required
                className={inputClass}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Cost ($) *</label>
            <input
              type="number"
              name="cost"
              step="0.01"
              min={0}
              required
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Channel</label>
              <select name="channel" className={selectClass}>
                <option value="">Select channel...</option>
                {salesChannels.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Payment method</label>
              <select name="paymentMethod" className={selectClass}>
                <option value="">Select...</option>
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Card last 4</label>
            <input
              type="text"
              name="cardLast4"
              maxLength={4}
              className={`${inputClass} max-w-32`}
              placeholder="e.g. 6921"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              rows={2}
              className={inputClass}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Add sale
            </button>
            <Link
              href={`/app/${businessSlug}/sales`}
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
