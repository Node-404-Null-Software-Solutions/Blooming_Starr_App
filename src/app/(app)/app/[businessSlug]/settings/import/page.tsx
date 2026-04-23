import { requireRole } from "@/lib/authz";
import ImportWorkbookClient from "./ImportWorkbookClient";

export const runtime = "nodejs";

export default async function ImportSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  await requireRole(["OWNER", "MANAGER"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Workbook</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your Inventory Trackers workbook (.xlsx) to import all sheets at once.
          KEY sheets seed your lookup tables; data sheets import records.
        </p>
      </div>
      <ImportWorkbookClient businessSlug={businessSlug} />
    </div>
  );
}
