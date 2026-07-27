import { requireBusinessMembership } from "@/lib/authz";
import { createEmployeeRepository } from "@/lib/repositories/employee";
import EmployeesClient from "./EmployeesClient";

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { businessContext } = await requireBusinessMembership(businessSlug);
  const employeeRepository = createEmployeeRepository(businessContext);

  const employees = await employeeRepository.listForManagement();

  const rows = employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email ?? "",
    phone: e.phone ?? "",
    position: e.position ?? "",
    hourlyRateCents: e.hourlyRateCents,
    salaryRateCents: e.salaryRateCents,
    status: e.status as "ACTIVE" | "INACTIVE",
    notes: e.notes ?? "",
  }));

  return (
    <EmployeesClient
      businessSlug={businessSlug}
      rows={rows}
    />
  );
}
