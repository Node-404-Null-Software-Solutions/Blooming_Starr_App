import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { createTransplantLog } from "@/lib/actions/data-entries";
import ModuleHeader from "../../_components/ModuleHeader";

export default async function NewTransplantLogPage({
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
    const res = await createTransplantLog(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/transplant-log`);
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Add transplant log"
        importHref={`/app/${businessSlug}/transplant-log/import`}
        addHref={`/app/${businessSlug}/transplant-log/new`}
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
            <label className="text-sm font-medium text-gray-700">Original SKU</label>
            <input
              type="text"
              name="originalSku"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. HS-BE-AW-1A"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Action</label>
              <input
                type="text"
                name="action"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Up-pot, Division"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Media</label>
              <input
                type="text"
                name="media"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Soil type"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">From pot</label>
              <input
                type="text"
                name="fromPot"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. 2.5&quot;"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">To pot</label>
              <input
                type="text"
                name="toPot"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. 4&quot;"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">ID code</label>
              <input
                type="text"
                name="idCode"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Internal ID"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">New / division SKU</label>
              <input
                type="text"
                name="divisionSku"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="If applicable"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Cost per unit ($)</label>
              <input
                type="number"
                name="cost"
                step="0.01"
                min={0}
                defaultValue={0}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Pot color</label>
              <input
                type="text"
                name="potColor"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Black, Terra cotta"
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
              href={`/app/${businessSlug}/transplant-log`}
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
