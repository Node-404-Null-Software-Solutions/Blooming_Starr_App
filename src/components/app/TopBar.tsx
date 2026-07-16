"use client";

import { FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, RefreshCw, Search } from "lucide-react";
import QrScanButton from "@/components/qr/QrScanButton";
import BusinessSwitcher, { type BusinessOption } from "@/components/app/BusinessSwitcher";

const placeholderMap: Record<string, string> = {
  "plant-intake": "Search Plant Intake",
  "product-intake": "Search Product Intake",
  "transplant-log": "Search Transplant Log",
  "treatment-tracking": "Search Treatment Tracking",
  "overhead-expenses": "Search Overhead Expenses",
  sales: "Search Sales",
  "fertilizer-log": "Search Fertilizer Log",
};

const getModuleFromPathname = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "app" && parts.length >= 2) {
    return parts[2] ?? parts[1] ?? "";
  }
  return parts[0] ?? "";
};

type TopBarProps = {
  onMenuClick?: () => void;
  logoUrl?: string | null;
  businessName?: string | null;
  businessSlug: string;
  businesses: BusinessOption[];
};

export default function TopBar({ onMenuClick, logoUrl, businessName, businessSlug, businesses }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const moduleKey = getModuleFromPathname(pathname);
  const placeholder = placeholderMap[moduleKey] ?? "Search";

  function updateSearch(nextQuery: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    const trimmed = nextQuery.trim();

    if (trimmed) nextParams.set("q", trimmed);
    else nextParams.delete("q");

    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams}` : pathname;
    router.push(nextUrl);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    updateSearch(String(formData.get("q") ?? ""));
  }

  function handleScan(value: string) {
    updateSearch(value);
  }

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-[#10aa15] bg-[#08bd12] shadow-sm">
      <div className="flex h-14 min-w-0 items-center gap-2 px-2 sm:gap-3 sm:px-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-sm p-2 text-white hover:bg-white/15"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 shrink-0 sm:min-w-[11rem]">
          <BusinessSwitcher
            currentSlug={businessSlug}
            businessName={businessName ?? "Blooming Starr"}
            logoUrl={logoUrl ?? null}
            businesses={businesses}
          />
        </div>
        <div className="flex min-w-0 flex-1 justify-center">
          <form onSubmit={handleSubmit} className="relative flex w-full min-w-0 max-w-[520px] items-center">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/85" />
            <input
              key={`${pathname}-${searchParams.get("q") ?? ""}`}
              type="text"
              name="q"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder={placeholder}
              className="h-10 w-full rounded-md border border-white/10 bg-white/25 px-3 py-2 pl-10 pr-10 text-sm text-white placeholder:text-white/90 focus:bg-white focus:text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50 focus:placeholder:text-gray-500"
            />
            <QrScanButton
              label={`${placeholder} by QR`}
              onScan={handleScan}
              iconOnly
              className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-white/85 hover:bg-white/15 hover:text-white"
            />
          </form>
        </div>
        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/20 text-white hover:bg-white/15"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#08bd12]">
            {(businessName ?? "D").trim().charAt(0).toUpperCase() || "D"}
          </div>
        </div>
      </div>
    </header>
  );
}
