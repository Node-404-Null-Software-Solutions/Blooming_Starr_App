import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { createFertilizerLog } from "@/lib/actions/data-entries";
import ModuleHeader from "../../_components/ModuleHeader";

export default async function NewFertilizerLogPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { profile } = await requireActiveMembership();
  const { businessSlug } = await params;
  const businessId = profile.activeBusinessId;
  if (!businessId) return null;

  async function submit(formData: FormData) {
    "use server";
    const res = await createFertilizerLog(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/fertilizer-log`);
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Add fertilizer log"
        addHref={`/app/${businessSlug}/fertilizer-log/new`}
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
              <label className="text-sm font-medium text-gray-700">Plant SKU</label>
              <input
                type="text"
                name="plantSku"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. HS-BE-AW-1A"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Pot SKU</label>
              <input
                type="text"
                name="potSku"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. POT-4-BLK"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Product</label>
            <input
              type="text"
              name="product"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. 20-20-20, Fish emulsion"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Method</label>
              <input
                type="text"
                name="method"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Foliar, Drench"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Rate</label>
              <input
                type="text"
                name="rate"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. 1 tsp/gal"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Unit</label>
              <input
                type="text"
                name="unit"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. 32 oz, 1 gal"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Next earliest</label>
              <input
                type="date"
                name="nextEarliest"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Next latest</label>
              <input
                type="date"
                name="nextLatest"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              rows={2}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Optional notes"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Add log
            </button>
            <Link
              href={`/app/${businessSlug}/fertilizer-log`}
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
