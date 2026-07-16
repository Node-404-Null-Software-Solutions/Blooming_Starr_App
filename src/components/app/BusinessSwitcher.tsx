"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Check, ChevronDown, Plus, Sprout, X } from "lucide-react";
import { switchBusiness } from "@/lib/actions/businesses";
import { createBusinessAndProfile } from "@/lib/actions/onboarding";

export type BusinessOption = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: "OWNER" | "MANAGER" | "EMPLOYEE";
};

type Props = {
  currentSlug: string;
  businessName: string;
  logoUrl: string | null;
  businesses: BusinessOption[];
};

export default function BusinessSwitcher({
  currentSlug,
  businessName,
  logoUrl,
  businesses,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function destinationFor(slug: string) {
    const prefix = `/app/${currentSlug}`;
    const suffix = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
    return `/app/${slug}${suffix}`;
  }

  function chooseBusiness(slug: string) {
    if (slug === currentSlug) {
      setOpen(false);
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await switchBusiness(slug);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(destinationFor(result.slug));
      router.refresh();
    });
  }

  function createBusiness(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createBusinessAndProfile(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreating(false);
      setOpen(false);
      router.push(`/app/${result.slug}`);
      router.refresh();
    });
  }

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen((value) => !value);
        }}
        className="flex min-w-0 items-center gap-2 rounded-sm p-1 text-left text-white hover:bg-white/15"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-white">
          {logoUrl ? (
            <Image src={logoUrl} alt="" width={36} height={36} unoptimized className="h-9 w-9 object-contain" />
          ) : (
            <Sprout className="h-5 w-5 text-[#08bd12]" />
          )}
        </span>
        <span className="hidden max-w-44 truncate text-xl font-medium sm:block">{businessName}</span>
        <ChevronDown className="hidden h-4 w-4 shrink-0 sm:block" />
        <span className="sr-only">Switch business</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 cursor-default"
            aria-label="Close business menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-12 z-[60] w-72 overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-xl" role="menu">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Businesses</p>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  type="button"
                  onClick={() => chooseBusiness(business.slug)}
                  disabled={isPending}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 disabled:opacity-60"
                  role="menuitem"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-50">
                    {business.logoUrl ? (
                      <Image src={business.logoUrl} alt="" width={32} height={32} unoptimized className="h-8 w-8 rounded-md object-contain" />
                    ) : (
                      <Building2 className="h-4 w-4 text-[#16BE1B]" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{business.name}</span>
                    <span className="block text-xs capitalize text-gray-500">{business.role.toLowerCase()}</span>
                  </span>
                  {business.slug === currentSlug && <Check className="h-4 w-4 text-[#16BE1B]" />}
                </button>
              ))}
            </div>
            {error && !creating && <p className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <button
              type="button"
              onClick={() => {
                setError("");
                setCreating(true);
              }}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-3 text-sm font-medium text-[#0E4D3A] hover:bg-gray-50"
              role="menuitem"
            >
              <Plus className="h-4 w-4" />
              Add another business
            </button>
          </div>
        </>
      )}

      {creating && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-gray-900 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="create-business-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-business-title" className="text-lg font-semibold">Add a business</h2>
                <p className="mt-1 text-sm text-gray-500">It will have its own inventory, expenses, sales, and employees.</p>
              </div>
              <button type="button" onClick={() => setCreating(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={createBusiness} className="mt-5 space-y-4">
              <div>
                <label htmlFor="newBusinessName" className="block text-sm font-medium text-gray-700">Business name</label>
                <input
                  id="newBusinessName"
                  name="businessName"
                  required
                  maxLength={100}
                  autoFocus
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#16BE1B] focus:outline-none focus:ring-1 focus:ring-[#16BE1B]"
                  placeholder="e.g. Northside Nursery"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCreating(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isPending} className="rounded-md bg-[#0E4D3A] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                  {isPending ? "Creating..." : "Create business"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
