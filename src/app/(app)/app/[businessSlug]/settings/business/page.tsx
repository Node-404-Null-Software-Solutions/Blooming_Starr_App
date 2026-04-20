import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { updateBusinessTheme } from "@/lib/actions/settings";
import { Building2, Palette } from "lucide-react";
import { ThemeSettingsForm } from "../ThemeSettingsForm";
import BusinessNameForm from "./BusinessNameForm";

export default async function BusinessSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { business: biz } = await requireRole(["OWNER", "MANAGER"]);
  const businessId = biz.id;

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { name: true, slug: true, primaryColor: true, secondaryColor: true, logoUrl: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your business profile and branding.</p>
      </div>

      {/* General */}
      <section className="rounded-md border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Building2 className="h-5 w-5 text-gray-400" />
          General
        </div>

        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <dt className="w-28 shrink-0 text-gray-500">Business name</dt>
            <dd className="flex-1">
              <BusinessNameForm name={business?.name ?? ""} businessSlug={businessSlug} />
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <dt className="w-28 shrink-0 text-gray-500">URL slug</dt>
            <dd>
              <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {business?.slug ?? businessSlug}
              </code>
            </dd>
          </div>
        </dl>
      </section>

      {/* Theme */}
      <section className="rounded-md border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Palette className="h-5 w-5 text-gray-400" />
          Theme
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Set primary and secondary colors for buttons, links, and accents across the app.
        </p>
        <ThemeSettingsForm
          businessSlug={businessSlug}
          primaryColor={business?.primaryColor ?? "#16BE1B"}
          secondaryColor={business?.secondaryColor ?? "#83BC39"}
          logoUrl={business?.logoUrl ?? null}
        />
      </section>
    </div>
  );
}
