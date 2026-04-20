"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calendar,
  ClipboardList,
  FlaskConical,
  Home,
  Leaf,
  Package,
  PackageCheck,
  Receipt,
  Settings,
  ShoppingCart,
  Sprout,
  Users,
} from "lucide-react";

type NavItem = {
  label: string;
  modulePath: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Plants",
    items: [
      { label: "Dashboard", modulePath: "", icon: Home },
      { label: "Plant Intake", modulePath: "/plant-intake", icon: Sprout },
      { label: "Plant Inventory", modulePath: "/plant-inventory", icon: Leaf },
    ],
  },
  {
    label: "Products",
    items: [
      { label: "Product Intake", modulePath: "/product-intake", icon: Package },
      { label: "Product Inventory", modulePath: "/product-inventory", icon: PackageCheck },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Transplant Log", modulePath: "/transplant-log", icon: ClipboardList },
      { label: "Treatment Tracking", modulePath: "/treatment-tracking", icon: Activity },
      { label: "Fertilizer Log", modulePath: "/fertilizer-log", icon: FlaskConical },
      { label: "Overhead Expenses", modulePath: "/overhead-expenses", icon: Receipt },
      { label: "Sales", modulePath: "/sales", icon: ShoppingCart },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Employees", modulePath: "/employees", icon: Users },
      { label: "Schedule", modulePath: "/schedule", icon: Calendar },
    ],
  },
  {
    label: null,
    items: [
      { label: "Settings", modulePath: "/settings", icon: Settings },
    ],
  },
];

const APP_BASE = "/app";

export default function AppSidebar({
  businessName,
  businessSlug,
}: {
  businessName?: string | null;
  businessSlug?: string;
}) {
  const pathname = usePathname();
  const slug = businessSlug ?? "default";

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[#0E4D3A]">
      {/* Brand header */}
      <div className="flex items-center gap-2.5 border-b border-white/15 px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
          <Sprout className="h-4 w-4 text-[#16BE1B]" />
        </div>
        <span className="truncate text-sm font-semibold tracking-wide text-white">
          {businessName ?? "Bloomingstarr"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const href = item.modulePath
                ? `${APP_BASE}/${slug}${item.modulePath}`
                : `${APP_BASE}/${slug}`;
              const isActive = item.modulePath
                ? pathname === href || pathname.startsWith(`${href}/`)
                : pathname === href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.modulePath}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-[#16BE1B] bg-white/10 font-medium text-white"
                      : "border-transparent text-white/70 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? "text-[#16BE1B]"
                        : "text-white/50 group-hover:text-white/80"
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
