"use client";

import { useState } from "react";
import TopBar from "@/components/app/TopBar";
import AppSidebar from "@/components/app/AppSidebar";

export default function AppShell({
  children,
  logoUrl,
  businessName,
  businessSlug,
}: {
  children: React.ReactNode;
  logoUrl?: string | null;
  businessName?: string | null;
  businessSlug?: string | null;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#f4f5f1] text-gray-900">
      <TopBar logoUrl={logoUrl ?? null} onMenuClick={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex">
        <div
          className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
            sidebarOpen ? "w-64" : "w-0"
          }`}
          aria-hidden={!sidebarOpen}
        >
          <AppSidebar businessName={businessName} businessSlug={businessSlug ?? undefined} />
        </div>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
