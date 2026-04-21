"use client";

import { useState, useEffect } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Open by default on desktop after first render
  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true);
  }, []);

  function handleNavClick() {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f4f5f1] text-gray-900">
      <TopBar logoUrl={logoUrl ?? null} onMenuClick={() => setSidebarOpen((p) => !p)} />

      <div className="flex">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar
            Mobile: fixed overlay, slides via translate (width stays 64 off-screen)
            Desktop: in-flow, collapses via width */}
        <div
          className={`
            fixed bottom-0 left-0 top-14 z-30 w-64
            md:relative md:top-auto md:bottom-auto md:z-auto
            shrink-0 overflow-hidden
            transition-transform duration-200 ease-in-out md:transition-[width] md:!transform-none
            ${sidebarOpen
              ? "translate-x-0 md:w-64"
              : "-translate-x-full md:w-0"}
          `}
          aria-hidden={!sidebarOpen}
        >
          <AppSidebar
            businessName={businessName}
            businessSlug={businessSlug ?? undefined}
            onNavClick={handleNavClick}
          />
        </div>

        <main className="min-w-0 flex-1 p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
