import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import EmployeesClient from "../../employees/EmployeesClient";

export default async function SettingsEmployeesPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { business } = await requireActiveMembership();

  const employees = await db.employee.findMany({
    where: { businessId: business.id },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      position: true,
      hourlyRateCents: true,
      salaryRateCents: true,
      status: true,
      notes: true,
    },
  });

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

  return <EmployeesClient businessSlug={businessSlug} rows={rows} />;
}
