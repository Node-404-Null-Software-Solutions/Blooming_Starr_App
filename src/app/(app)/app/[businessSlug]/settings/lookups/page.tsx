import { requireRole } from "@/lib/authz";
import { getLookupEntriesMulti } from "@/lib/actions/lookups";
import type { LookupTable } from "@/lib/actions/lookups";
import LookupsManager from "./LookupsManager";

const ALL_TABLES: { key: LookupTable; label: string }[] = [
  { key: "plantSource", label: "Plant Sources" },
  { key: "genus", label: "Genera" },
  { key: "cultivar", label: "Cultivars" },
  { key: "plantId", label: "Plant IDs" },
  { key: "productSource", label: "Product Sources" },
  { key: "productCategory", label: "Categories" },
  { key: "productSize", label: "Sizes" },
  { key: "productStyle", label: "Styles" },
  { key: "paymentMethod", label: "Payment Methods" },
  { key: "salesChannel", label: "Sales Channels" },
  { key: "origin", label: "Origins" },
  { key: "status", label: "Statuses" },
  { key: "environment", label: "Environments" },
  { key: "transplantAction", label: "Transplant Actions" },
  { key: "transplantMedia", label: "Transplant Media" },
  { key: "potSize", label: "Pot Sizes" },
  { key: "potColor", label: "Pot Colors" },
  { key: "expenseCategory", label: "Expense Categories" },
  { key: "expenseVendor", label: "Expense Vendors" },
  { key: "fertilizerProduct", label: "Fertilizer Products" },
  { key: "treatmentProduct", label: "Treatment Products" },
];

export default async function LookupsSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  await requireRole(["OWNER", "MANAGER"]);

  const lookups = await getLookupEntriesMulti(ALL_TABLES.map((t) => t.key));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lookup Tables</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage the codes used for SKU generation and form dropdowns.
        </p>
      </div>
      <LookupsManager
        businessSlug={businessSlug}
        tables={ALL_TABLES}
        initialData={lookups}
      />
    </div>
  );
}
