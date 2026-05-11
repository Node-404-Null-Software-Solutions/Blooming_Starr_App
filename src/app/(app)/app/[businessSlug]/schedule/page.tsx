import { requireActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import ScheduleClient from "./ScheduleClient";

function getMonday(dateStr?: string): Date {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { businessSlug } = await params;
  const sp = await searchParams;
  const { business } = await requireActiveMembership();

  const monday = getMonday(sp.week);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const [employees, entries] = await Promise.all([
    db.employee.findMany({
      where: { businessId: business.id, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.scheduleEntry.findMany({
      where: {
        businessId: business.id,
        date: { gte: monday, lte: sunday },
      },
      include: { employee: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const serializedEntries = entries.map((e) => ({
    id: e.id,
    employeeId: e.employeeId,
    employeeName: e.employee.name,
    date: e.date.toISOString().slice(0, 10),
    startTime: e.startTime,
    endTime: e.endTime,
    title: e.title ?? "",
    notes: e.notes ?? "",
  }));

  return (
    <ScheduleClient
      businessSlug={businessSlug}
      employees={employees}
      entries={serializedEntries}
      weekStart={monday.toISOString().slice(0, 10)}
    />
  );
}
