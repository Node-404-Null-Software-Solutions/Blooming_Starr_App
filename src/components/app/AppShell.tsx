"use client";

import { useState, useSyncExternalStore } from "react";
import TopBar from "@/components/app/TopBar";
import AppSidebar from "@/components/app/AppSidebar";

function subscribeToDesktopChanges(callback: () => void) {
  const mediaQuery = window.matchMedia("(min-width: 768px)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}

function getServerDesktopSnapshot() {
  return false;
}

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
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopChanges,
    getDesktopSnapshot,
    getServerDesktopSnapshot
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTouched, setSidebarTouched] = useState(false);
  const isSidebarOpen = sidebarTouched ? sidebarOpen : isDesktop;

  function toggleSidebar() {
    setSidebarTouched(true);
    setSidebarOpen(!isSidebarOpen);
  }

  function closeSidebar() {
    setSidebarTouched(true);
    setSidebarOpen(false);
  }

  function handleNavClick() {
    if (!isDesktop) closeSidebar();
  }

  return (
    <div className="min-h-screen bg-[#f4f5f1] text-gray-900">
      <TopBar logoUrl={logoUrl ?? null} onMenuClick={toggleSidebar} />

      <div className="flex">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={closeSidebar}
          />
        )}


        <div
          className={`
            fixed bottom-0 left-0 top-14 z-30 w-64
            md:relative md:top-auto md:bottom-auto md:z-auto
            shrink-0 overflow-hidden
            transition-transform duration-200 ease-in-out md:transition-[width] md:!transform-none
            ${isSidebarOpen
              ? "translate-x-0 md:w-64"
              : "-translate-x-full md:w-0"}
          `}
          aria-hidden={!isSidebarOpen}
        >
          <AppSidebar
            businessName={businessName}
            businessSlug={businessSlug ?? undefined}
            logoUrl={logoUrl ?? null}
            onNavClick={handleNavClick}
          />
        </div>

        <main className="min-w-0 flex-1 p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
