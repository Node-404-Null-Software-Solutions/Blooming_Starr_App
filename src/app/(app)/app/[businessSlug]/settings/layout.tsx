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
    <div className="-m-3 md:-m-6 flex min-h-[calc(100vh-3.5rem)] flex-col md:flex-row">

      <div className="shrink-0 border-b border-gray-200 bg-white md:w-44 md:border-b-0 md:border-r">
        <SettingsNav businessSlug={businessSlug} />
      </div>

      <div className="min-w-0 flex-1 p-3 md:p-6">
        {children}
      </div>
    </div>
  );
}
