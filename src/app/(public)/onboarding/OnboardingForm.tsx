"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { createBusinessAndProfile } from "@/lib/actions/onboarding";

export default function OnboardingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createBusinessAndProfile(formData);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      router.push(`/app/${res.slug}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
          Business Name
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          required
          maxLength={100}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
          placeholder="e.g. Blooming Starr Nursery"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[#0E4D3A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0E4D3A]/90 disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create Business"}
      </button>
    </form>
  );
}
