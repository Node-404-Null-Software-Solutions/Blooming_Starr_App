"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { createScheduleEntry, deleteScheduleEntry } from "@/lib/actions/schedule";
import ShiftForm from "./ShiftForm";

type Employee = { id: string; name: string };
type Entry = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  notes: string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ScheduleClient({
  businessSlug,
  employees,
  entries,
  weekStart,
}: {
  businessSlug: string;
  employees: Employee[];
  entries: Entry[];
  weekStart: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState<{ date: string; employeeId?: string } | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  function navigateWeek(week: string) {
    router.push(`/app/${businessSlug}/schedule?week=${week}`);
  }

  function getEntriesForCell(employeeId: string, date: string) {
    return entries.filter((e) => e.employeeId === employeeId && e.date === date);
  }

  async function handleDelete(entryId: string) {
    const res = await deleteScheduleEntry(entryId, businessSlug);
    if (res.ok) startTransition(() => router.refresh());
  }

  function handleFormSuccess() {
    setShowForm(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateWeek(prevWeek)}
            className="rounded-md border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[180px] text-center text-sm font-medium text-gray-700">
            {formatDateShort(weekStart)} – {formatDateShort(addDays(weekStart, 6))}
          </span>
          <button
            type="button"
            onClick={() => navigateWeek(nextWeek)}
            className="rounded-md border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>


      {employees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          <p className="font-semibold text-gray-900">No employees yet.</p>
          <p className="mt-1">Add employees first to start scheduling.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-600">
                <th className="sticky left-0 z-20 border-r border-gray-200 bg-gray-50 px-3 py-2 text-left">
                  Employee
                </th>
                {weekDays.map((day, i) => (
                  <th key={day} className="px-2 py-2 text-center">
                    <div>{DAY_LABELS[i]}</div>
                    <div className="text-[10px] font-normal text-gray-400">{formatDateShort(day)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t border-gray-100">
                  <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 whitespace-nowrap">
                    {emp.name}
                  </td>
                  {weekDays.map((day) => {
                    const cellEntries = getEntriesForCell(emp.id, day);
                    return (
                      <td key={day} className="px-1 py-1 align-top">
                        <div className="min-h-[60px] space-y-1">
                          {cellEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="group relative rounded bg-[#0E4D3A]/10 px-1.5 py-1 text-xs"
                            >
                              <div className="font-medium text-[#0E4D3A]">
                                {entry.startTime}–{entry.endTime}
                              </div>
                              {entry.title && (
                                <div className="text-gray-600 truncate">{entry.title}</div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDelete(entry.id)}
                                className="absolute -top-1 -right-1 hidden rounded-full bg-red-500 p-0.5 text-white group-hover:block"
                                title="Delete shift"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowForm({ date: day, employeeId: emp.id })}
                            className="flex w-full items-center justify-center rounded border border-dashed border-gray-200 py-1 text-gray-400 hover:border-[#16BE1B] hover:text-[#16BE1B]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isPending && <p className="text-xs text-gray-500">Saving…</p>}


      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Add Shift</h2>
            <ShiftForm
              businessSlug={businessSlug}
              employees={employees}
              defaultDate={showForm.date}
              defaultEmployeeId={showForm.employeeId}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
