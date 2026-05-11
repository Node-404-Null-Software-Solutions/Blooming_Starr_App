"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createBusinessAndProfile(
  formData: FormData
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated." };

  const businessName = (formData.get("businessName") as string)?.trim();
  if (!businessName || businessName.length > 100) {
    return { ok: false, error: "Business name is required (max 100 chars)." };
  }


  const existingProfile = await db.profile.findUnique({ where: { userId } });
  if (existingProfile?.activeBusinessId) {
    const biz = await db.business.findUnique({
      where: { id: existingProfile.activeBusinessId },
      select: { slug: true },
    });
    if (biz) return { ok: true, slug: biz.slug };
  }


  let baseSlug = slugify(businessName);
  if (!baseSlug) baseSlug = "my-business";
  let slug = baseSlug;
  let attempt = 0;
  while (await db.business.findUnique({ where: { slug }, select: { id: true } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const result = await db.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: businessName,
        slug,
        ownerId: userId,
      },
    });

    const profile = existingProfile
      ? await tx.profile.update({
          where: { userId },
          data: { activeBusinessId: business.id },
        })
      : await tx.profile.create({
          data: {
            userId,
            activeBusinessId: business.id,
          },
        });

    await tx.membership.create({
      data: {
        businessId: business.id,
        userId,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    return { slug: business.slug, profileId: profile.id };
  });

  return { ok: true, slug: result.slug };
}
