"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import ModuleHeader from "../_components/ModuleHeader";
import { updateEmployee, deactivateEmployee, reactivateEmployee } from "@/lib/actions/employees";
import { EditableCell } from "@/components/data-table/EditableCell";

export type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  hourlyRateCents: number;
  salaryRateCents: number;
  status: "ACTIVE" | "INACTIVE";
  notes: string;
};

export default function EmployeesClient({
  businessSlug,
  rows,
}: {
  businessSlug: string;
  rows: EmployeeRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasRows = rows.length > 0;

  async function handleSave(
    id: string,
    field: keyof Omit<EmployeeRow, "id" | "status">,
    value: string
  ) {
    const payload: Record<string, unknown> = {};
    if (field === "name") payload.name = value;
    else if (field === "email") payload.email = value || null;
    else if (field === "phone") payload.phone = value || null;
    else if (field === "position") payload.position = value || null;
    else if (field === "hourlyRateCents") {
      const cents = Math.round(parseFloat(value) * 100);
      if (!Number.isNaN(cents)) payload.hourlyRateCents = cents;
    } else if (field === "salaryRateCents") {
      const cents = Math.round(parseFloat(value) * 100);
      if (!Number.isNaN(cents)) payload.salaryRateCents = cents;
    } else if (field === "notes") payload.notes = value || null;

    const res = await updateEmployee(
      id,
      businessSlug,
      payload as Parameters<typeof updateEmployee>[2]
    );
    if (res.ok) startTransition(() => router.refresh());
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const action =
      currentStatus === "ACTIVE"
        ? deactivateEmployee
        : reactivateEmployee;
    const res = await action(id, businessSlug);
    if (res.ok) startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Employees"
        addHref={`/app/${businessSlug}/employees/new`}
      />

      {!hasRows ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          <div className="text-base font-semibold text-gray-900">
            No employees yet.
          </div>
          <p className="mt-2">Add your first employee to get started.</p>
          <div className="mt-4">
            <Link
              href={`/app/${businessSlug}/employees/new`}
              className="inline-flex items-center rounded-md bg-[#0E4D3A] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Add Employee
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                <th className="sticky top-0 z-10 px-3 py-2">Name</th>
                <th className="sticky top-0 z-10 px-3 py-2">Email</th>
                <th className="sticky top-0 z-10 px-3 py-2">Phone</th>
                <th className="sticky top-0 z-10 px-3 py-2">Position</th>
                <th className="sticky top-0 z-10 px-3 py-2">Hourly Rate</th>
                <th className="sticky top-0 z-10 px-3 py-2">Salary</th>
                <th className="sticky top-0 z-10 px-3 py-2">Status</th>
                <th className="sticky top-0 z-10 px-3 py-2">Notes</th>
                <th className="sticky top-0 z-10 px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={row.name}
                      onSave={(v) => handleSave(row.id, "name", v)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={row.email}
                      onSave={(v) => handleSave(row.id, "email", v)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={row.phone}
                      onSave={(v) => handleSave(row.id, "phone", v)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={row.position}
                      onSave={(v) => handleSave(row.id, "position", v)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={(row.hourlyRateCents / 100).toFixed(2)}
                      onSave={(v) => handleSave(row.id, "hourlyRateCents", v)}
                      type="currency"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EditableCell
                      value={(row.salaryRateCents / 100).toFixed(2)}
                      onSave={(v) => handleSave(row.id, "salaryRateCents", v)}
                      type="currency"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {row.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <EditableCell
                      value={row.notes}
                      onSave={(v) => handleSave(row.id, "notes", v)}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(row.id, row.status)}
                      disabled={isPending}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        row.status === "ACTIVE"
                          ? "border border-red-200 text-red-700 hover:bg-red-50"
                          : "border border-green-200 text-green-700 hover:bg-green-50"
                      } disabled:opacity-50`}
                    >
                      {row.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasRows && isPending && <p className="text-xs text-gray-500">Saving…</p>}
    </div>
  );
}
