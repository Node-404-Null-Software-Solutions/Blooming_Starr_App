"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { createEmployee } from "@/lib/actions/employees";

export default function EmployeeForm({ businessSlug }: { businessSlug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createEmployee(businessSlug, formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/app/${businessSlug}/employees`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
        />
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
          />
        </div>
      </div>

      {/* Position */}
      <div>
        <label htmlFor="position" className="block text-sm font-medium text-gray-700">Position</label>
        <input
          id="position"
          name="position"
          type="text"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
          placeholder="e.g. Nursery Assistant"
        />
      </div>

      {/* Pay Rates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
            Hourly Rate ($)
          </label>
          <input
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0.00"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
          />
        </div>
        <div>
          <label htmlFor="salaryRate" className="block text-sm font-medium text-gray-700">
            Salary Rate ($)
          </label>
          <input
            id="salaryRate"
            name="salaryRate"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0.00"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#0E4D3A] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Employee"}
        </button>
      </div>
    </form>
  );
}
