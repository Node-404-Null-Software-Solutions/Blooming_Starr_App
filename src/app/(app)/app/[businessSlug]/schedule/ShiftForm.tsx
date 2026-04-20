"use client";

import { useTransition, useState } from "react";
import { createScheduleEntry } from "@/lib/actions/schedule";

type Employee = { id: string; name: string };

export default function ShiftForm({
  businessSlug,
  employees,
  defaultDate,
  defaultEmployeeId,
  onSuccess,
  onCancel,
}: {
  businessSlug: string;
  employees: Employee[];
  defaultDate?: string;
  defaultEmployeeId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createScheduleEntry(businessSlug, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
          Employee
        </label>
        <select
          id="employeeId"
          name="employeeId"
          required
          defaultValue={defaultEmployeeId ?? ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
        >
          <option value="" disabled>Select employee…</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={defaultDate ?? ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start</label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue="09:00"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
          />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End</label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            required
            defaultValue="17:00"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title (optional)</label>
        <input
          id="title"
          name="title"
          type="text"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
          placeholder="e.g. Morning shift"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#0E4D3A] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Add Shift"}
        </button>
      </div>
    </form>
  );
}
