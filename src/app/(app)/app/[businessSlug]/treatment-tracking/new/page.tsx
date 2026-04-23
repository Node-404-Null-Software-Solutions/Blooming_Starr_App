import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { createTreatmentTracking } from "@/lib/actions/data-entries";
import ModuleHeader from "../../_components/ModuleHeader";

export default async function NewTreatmentTrackingPage({
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
    const res = await createTreatmentTracking(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/treatment-tracking`);
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Add treatment"
        addHref={`/app/${businessSlug}/treatment-tracking/new`}
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
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">SKU *</label>
            <input
              type="text"
              name="sku"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. HS-BE-AW-1A"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Target</label>
            <input
              type="text"
              name="target"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Aphids, Mites"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Product</label>
            <input
              type="text"
              name="product"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Insecticidal soap"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Active ingredient</label>
              <input
                type="text"
                name="activeIngredient"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Spinosad"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">EPA #</label>
              <input
                type="text"
                name="epaNumber"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. 53883-217-4"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Rate</label>
              <input
                type="text"
                name="rate"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. 2 tbsp/gal"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Pot size</label>
              <input
                type="text"
                name="potSize"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. 4&quot;"
              />
            </div>
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
              <label className="text-sm font-medium text-gray-700">Initials</label>
              <input
                type="text"
                name="initials"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Who applied"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              Add treatment
            </button>
            <Link
              href={`/app/${businessSlug}/treatment-tracking`}
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
