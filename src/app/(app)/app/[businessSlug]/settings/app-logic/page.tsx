import { listAppLogicRules } from "@/lib/actions/app-logic";
import AppLogicManager from "./AppLogicManager";

export default async function AppLogicPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const rules = await listAppLogicRules();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">App Logic</h1>
        <p className="mt-1 text-sm text-gray-500">
          Owner-controlled rules for module behavior, formulas, and workflow scripts.
        </p>
      </div>

      <AppLogicManager businessSlug={businessSlug} initialRules={rules} />
    </div>
  );
}
