"use client";

import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";

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
};

export default function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const moduleKey = getModuleFromPathname(pathname);
  const placeholder = placeholderMap[moduleKey] ?? "Search";

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-white/10 bg-[#0E4D3A] shadow-sm">
      <div className="flex h-14 items-center gap-3 px-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="ml-2 flex min-w-0 flex-1">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={placeholder}
              className="w-full rounded-md border border-white/10 bg-white px-3 py-2 pl-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#16BE1B]/40"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
