"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";

const currentYear = new Date().getFullYear();
const TAX_YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

export default function DashboardFilter({
  businessSlug,
}: {
  businessSlug: string;
}) {
  const sp = useSearchParams();
  const taxYearParam = sp.get("taxYear") ?? String(currentYear);
  const basePath = `/app/${businessSlug}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/80 px-2 py-1">
        <FileText className="h-4 w-4 text-amber-700" aria-hidden />
        <span className="text-xs font-medium text-amber-800">Tax year</span>
        <div className="flex items-center gap-0.5">
          {TAX_YEAR_OPTIONS.map((year) => {
            const isActive = taxYearParam === String(year);
            return (
              <Link
                key={year}
                href={`${basePath}?taxYear=${year}`}
                className={`rounded px-2 py-1 text-sm ${
                  isActive
                    ? "bg-amber-200 font-medium text-amber-900"
                    : "text-amber-800 hover:bg-amber-100"
                }`}
              >
                {year}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
