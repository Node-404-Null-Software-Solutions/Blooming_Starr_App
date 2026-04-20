import type { ReactNode } from "react";
import SettingsNav from "./SettingsNav";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  return (
    <div className="-m-6 flex min-h-[calc(100vh-3.5rem)]">
      {/* Sub-nav */}
      <div className="w-44 shrink-0 border-r border-gray-200 bg-white">
        <SettingsNav businessSlug={businessSlug} />
      </div>
      {/* Content */}
      <div className="min-w-0 flex-1 p-6">
        {children}
      </div>
    </div>
  );
}
