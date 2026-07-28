import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { createBusinessContext } from "@/lib/business-context";
import { OPERATION_MANAGER_ROLES } from "@/lib/permissions";
import type { Role } from "@prisma/client";

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return userId;
}

export async function requireActiveMembership() {
  const userId = await requireUserId();

  let profile = await db.profile.findUnique({ where: { userId } });

  let membership = profile?.activeBusinessId
    ? await db.membership.findFirst({
        where: {
          businessId: profile.activeBusinessId,
          userId,
          status: "ACTIVE",
        },
        include: { business: true },
      })
    : null;

  // Recover gracefully when a user's active business was removed or disabled.
  membership ??= await db.membership.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect("/onboarding");

  if (profile?.activeBusinessId !== membership.businessId) {
    profile = await db.profile.upsert({
      where: { userId },
      update: { activeBusinessId: membership.businessId },
      create: { userId, activeBusinessId: membership.businessId },
    });
  }

  const businessContext = createBusinessContext({
    requestId: randomUUID(),
    userId,
    membershipId: membership.id,
    businessId: membership.businessId,
    businessSlug: membership.business.slug,
    role: membership.role,
  });

  return {
    userId,
    profile: profile!,
    membership,
    business: membership.business,
    businessContext,
  };
}

export async function requireBusinessMembership(businessSlug: string) {
  const userId = await requireUserId();
  const membership = await db.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      business: { slug: businessSlug },
    },
    include: { business: true },
  });

  if (!membership) redirect("/app");

  let profile = await db.profile.findUnique({ where: { userId } });
  if (profile?.activeBusinessId !== membership.businessId) {
    profile = await db.profile.upsert({
      where: { userId },
      update: { activeBusinessId: membership.businessId },
      create: { userId, activeBusinessId: membership.businessId },
    });
  }

  const businessContext = createBusinessContext({
    requestId: randomUUID(),
    userId,
    membershipId: membership.id,
    businessId: membership.businessId,
    businessSlug: membership.business.slug,
    role: membership.role,
  });

  return {
    userId,
    profile: profile!,
    membership,
    business: membership.business,
    businessContext,
  };
}

export async function requireRole(allowedRoles: readonly Role[]) {
  const ctx = await requireActiveMembership();
  if (!allowedRoles.includes(ctx.membership.role)) {
    redirect(`/app/${ctx.business.slug}`);
  }
  return ctx;
}

export async function requireBusinessRole(
  businessSlug: string,
  allowedRoles: readonly Role[],
) {
  const ctx = await requireBusinessMembership(businessSlug);
  if (!allowedRoles.includes(ctx.membership.role)) {
    redirect(`/app/${ctx.business.slug}`);
  }
  return ctx;
}

export async function requireBusinessOperationManager(businessSlug: string) {
  return requireBusinessRole(businessSlug, OPERATION_MANAGER_ROLES);
}

export async function getOptionalAuth() {
  const { userId } = await auth();
  return userId ?? null;
}
