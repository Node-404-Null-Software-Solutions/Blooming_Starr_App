"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Calculator, Table, Users, UserCircle } from "lucide-react";

const navItems = [
  { label: "Business", icon: Building2, segment: "business" },
  { label: "Team", icon: Users, segment: "team" },
  { label: "Employees", icon: UserCircle, segment: "employees" },
  { label: "Lookups", icon: Table, segment: "lookups" },
  { label: "Formulas", icon: Calculator, segment: "formulas" },
];

export default function SettingsNav({ businessSlug }: { businessSlug: string }) {
  const pathname = usePathname();

  return (
    <nav className="py-4">
      <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Settings
      </p>
      {navItems.map(({ label, icon: Icon, segment }) => {
        const href = `/app/${businessSlug}/settings/${segment}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={segment}
            href={href}
            className={`flex items-center gap-2.5 border-l-2 px-4 py-2.5 text-sm transition-colors ${
              isActive
                ? "border-[#16BE1B] bg-[#0E4D3A]/5 font-medium text-[#0E4D3A]"
                : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#0E4D3A]" : "text-gray-400"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
