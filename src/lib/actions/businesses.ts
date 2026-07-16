"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function switchBusiness(
  businessSlug: string
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const membership = await db.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      business: { slug: businessSlug },
    },
    select: { businessId: true, business: { select: { slug: true } } },
  });
  if (!membership) {
    return { ok: false, error: "You do not have access to that business." };
  }

  await db.profile.upsert({
    where: { userId },
    update: { activeBusinessId: membership.businessId },
    create: { userId, activeBusinessId: membership.businessId },
  });

  return { ok: true, slug: membership.business.slug };
}
