import type * as React from "react";
import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/authz";

export default async function BusinessAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const { business } = await requireActiveMembership();

  if (businessSlug !== business.slug) {
    redirect(`/app/${business.slug}`);
  }

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
      {children}
    </div>
  );
}
