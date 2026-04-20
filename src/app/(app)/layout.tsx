import type { ReactNode } from "react";
import AppShell from "@/components/app/AppShell";
import { requireActiveMembership } from "@/lib/authz";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { business } = await requireActiveMembership();

  return (
    <div
      className="min-h-screen bg-gray-100 text-gray-900"
      style={
        {
          "--primary": business.primaryColor ?? "#16BE1B",
          "--secondary": business.secondaryColor ?? "#83BC39",
        } as React.CSSProperties
      }
    >
      <AppShell
        logoUrl={business.logoUrl ?? null}
        businessName={business.name}
        businessSlug={business.slug}
      >
        {children}
      </AppShell>
    </div>
  );
}
