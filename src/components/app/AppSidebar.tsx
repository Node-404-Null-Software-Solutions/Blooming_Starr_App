"use client";

import Image from "next/image";
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
  logoUrl,
  onNavClick,
}: {
  businessName?: string | null;
  businessSlug?: string;
  logoUrl?: string | null;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const slug = businessSlug ?? "default";

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:w-12">

      <div className="hidden h-10 items-center justify-center border-b border-gray-200 md:flex">
        <span className="sr-only">{businessName ?? "Bloomingstarr"}</span>
      </div>

      <div className="flex items-center gap-2.5 border-b border-gray-200 px-4 py-4 md:hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="h-8 w-8 rounded-md object-contain"
            />
          ) : (
            <Sprout className="h-4 w-4 text-[#16BE1B]" />
          )}
        </div>
        <span className="truncate text-sm font-semibold tracking-wide text-gray-900">
          {businessName ?? "Bloomingstarr"}
        </span>
      </div>


      <nav className="flex-1 overflow-y-auto py-2 md:py-1">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 md:sr-only">
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
                  onClick={onNavClick}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                  className={`group flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors md:h-10 md:justify-center md:px-0 ${
                    isActive
                      ? "border-[#16BE1B] bg-[#e7f8e8] font-medium text-gray-900"
                      : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? "text-[#16BE1B]"
                        : "text-gray-500 group-hover:text-gray-800"
                    }`}
                  />
                  <span className="flex-1 md:sr-only">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
