import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
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

  const [lookups, plantSkus] = await Promise.all([
    getLookupEntriesMulti(["transplantAction", "transplantMedia", "potSize", "potColor"]),
    db.plantIntake.findMany({
      where: { businessId },
      select: { sku: true },
      orderBy: { sku: "asc" },
      distinct: ["sku"],
    }),
  ]);

  const actionOptions = lookups.transplantAction?.map((e) => e.name) ?? [];
  const mediaOptions = lookups.transplantMedia?.map((e) => e.name) ?? [];
  const potSizeOptions = lookups.potSize?.map((e) => e.name) ?? [];
  const potColorOptions = lookups.potColor?.map((e) => e.name) ?? [];
  const skuList = plantSkus.map((p) => p.sku);

  async function submit(formData: FormData): Promise<void> {
    "use server";
    const res = await createTransplantLog(businessSlug, formData);
    if (res.ok) redirect(`/app/${businessSlug}/transplant-log`);
  }

  const fieldClass = "rounded-md border border-gray-300 px-3 py-2 text-sm w-full";

  function SelectOrInput({
    name,
    options,
    placeholder,
  }: {
    name: string;
    options: string[];
    placeholder?: string;
  }) {
    if (options.length > 0) {
      return (
        <select name={name} className={fieldClass}>
          <option value="">— select —</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type="text"
        name={name}
        className={fieldClass}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Add transplant log"
        addHref={`/app/${businessSlug}/transplant-log/new`}
      />
      <div className="rounded-md border border-gray-200 bg-white p-6">
        <form action={submit as (fd: FormData) => Promise<void>} className="flex max-w-xl flex-col gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input type="date" name="date" className={fieldClass} />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Original SKU</label>
            {skuList.length > 0 ? (
              <>
                <input
                  type="text"
                  name="originalSku"
                  list="sku-list"
                  className={fieldClass}
                  placeholder="Type or select a SKU"
                />
                <datalist id="sku-list">
                  {skuList.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </>
            ) : (
              <input
                type="text"
                name="originalSku"
                className={fieldClass}
                placeholder="e.g. HS-BE-AW-1A"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Action</label>
              <SelectOrInput name="action" options={actionOptions} placeholder="e.g. Up-pot, Division" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Media</label>
              <SelectOrInput name="media" options={mediaOptions} placeholder="e.g. Soil type" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">From pot</label>
              <SelectOrInput name="fromPot" options={potSizeOptions} placeholder={`e.g. 2.5"`} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">To pot</label>
              <SelectOrInput name="toPot" options={potSizeOptions} placeholder={`e.g. 4"`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">ID code</label>
              <input type="text" name="idCode" className={fieldClass} placeholder="Internal ID" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">New / division SKU</label>
              <input type="text" name="divisionSku" className={fieldClass} placeholder="If applicable" />
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
                className={fieldClass}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Pot color</label>
              <SelectOrInput name="potColor" options={potColorOptions} placeholder="e.g. Black, White" />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              rows={2}
              className={fieldClass}
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
