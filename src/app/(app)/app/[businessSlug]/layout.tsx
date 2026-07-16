import type * as React from "react";
import AppShell from "@/components/app/AppShell";
import { requireBusinessMembership } from "@/lib/authz";
import { db } from "@/lib/db";

export default async function BusinessAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { business, userId } = await requireBusinessMembership(businessSlug);
  const memberships = await db.membership.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      role: true,
      business: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
    orderBy: { business: { name: "asc" } },
  });

  return (
    <div
      className="min-h-screen bg-[#f4f5f1] text-gray-900"
      style={
        {
          "--primary": business.primaryColor ?? "#16BE1B",
          "--secondary": business.secondaryColor ?? "#83BC39",
        } as React.CSSProperties
      }
    >
      <AppShell
        logoUrl={business.logoUrl}
        businessName={business.name}
        businessSlug={business.slug}
        businesses={memberships.map(({ business: item, role }) => ({ ...item, role }))}
      >
        {children}
      </AppShell>
    </div>
  );
}
