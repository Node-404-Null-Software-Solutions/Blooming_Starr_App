import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

/**
 * Require an authenticated user with an active business membership.
 * Redirects to /sign-in if not authenticated, /onboarding if no profile or business.
 */
export async function requireActiveMembership() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile?.activeBusinessId) redirect("/onboarding");

  const membership = await db.membership.findFirst({
    where: {
      businessId: profile.activeBusinessId,
      userId,
      status: "ACTIVE",
    },
  });
  if (!membership) redirect("/onboarding");

  const business = await db.business.findUnique({
    where: { id: profile.activeBusinessId },
  });
  if (!business) redirect("/onboarding");

  return { userId, profile, membership, business };
}

/**
 * Require specific roles. Bounces to the dashboard if the user lacks permission.
 */
export async function requireRole(allowedRoles: Role[]) {
  const ctx = await requireActiveMembership();
  if (!allowedRoles.includes(ctx.membership.role)) {
    redirect(`/app/${ctx.business.slug}`);
  }
  return ctx;
}

/**
 * Get the current Clerk userId without requiring a membership.
 * Returns null if not signed in.
 */
export async function getOptionalAuth() {
  const { userId } = await auth();
  return userId ?? null;
}
