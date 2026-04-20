import { requireActiveMembership } from "@/lib/authz";
import EmployeeForm from "./EmployeeForm";

export default async function NewEmployeePage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  await requireActiveMembership();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Employee</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new employee record.
        </p>
      </div>
      <EmployeeForm businessSlug={businessSlug} />
    </div>
  );
}
