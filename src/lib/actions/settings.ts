"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

function parseHex(value: string | null): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (s.startsWith("#") && s.length === 7 && HEX_REGEX.test(s)) return s;
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`;
  return null;
}

export async function updateBusinessTheme(
  businessSlug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const { business } = await requireRole(["OWNER", "MANAGER"]);
  const businessId = business.id;

  const primary = parseHex(formData.get("primaryColor") as string | null);
  const secondary = parseHex(formData.get("secondaryColor") as string | null);
  const logoUrlRaw = formData.get("logoUrl");
  const logoUrl =
    logoUrlRaw === null || logoUrlRaw === undefined
      ? undefined
      : String(logoUrlRaw).trim() || null;

  const updateData: { primaryColor?: string; secondaryColor?: string; logoUrl?: string | null } = {};
  if (primary !== null) updateData.primaryColor = primary;
  if (secondary !== null) updateData.secondaryColor = secondary;
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;

  await db.business.update({
    where: { id: businessId },
    data: updateData,
  });

  revalidatePath(`/app/${businessSlug}`);
  revalidatePath(`/app/${businessSlug}/settings`);
  revalidatePath(`/app/${businessSlug}/settings/business`);
  return { ok: true };
}

export async function updateBusinessName(
  businessSlug: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const { business } = await requireRole(["OWNER"]);
  const businessId = business.id;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required" };
  if (name.length > 100) return { ok: false, error: "Name too long (max 100 characters)" };

  await db.business.update({ where: { id: businessId }, data: { name } });

  revalidatePath(`/app/${businessSlug}`);
  revalidatePath(`/app/${businessSlug}/settings/business`);
  return { ok: true };
}

export async function approveJoinRequest(
  requestId: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { business, userId } = await requireRole(["OWNER"]);
  const businessId = business.id;

  const request = await db.joinRequest.findFirst({
    where: { id: requestId, businessId, status: "PENDING" },
  });
  if (!request) return { ok: false, error: "Request not found" };

  await db.$transaction([
    db.membership.create({
      data: {
        businessId,
        userId: request.requesterId,
        role: request.requestedRole,
        status: "ACTIVE",
      },
    }),
    db.joinRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", reviewedBy: userId, reviewedAt: new Date() },
    }),
  ]);

  revalidatePath(`/app/${businessSlug}/settings/team`);
  return { ok: true };
}

export async function denyJoinRequest(
  requestId: string,
  businessSlug: string
): Promise<{ ok: boolean; error?: string }> {
  const { business, userId } = await requireRole(["OWNER"]);
  const businessId = business.id;

  const request = await db.joinRequest.findFirst({
    where: { id: requestId, businessId, status: "PENDING" },
  });
  if (!request) return { ok: false, error: "Request not found" };

  await db.joinRequest.update({
    where: { id: requestId },
    data: { status: "DENIED", reviewedBy: userId, reviewedAt: new Date() },
  });

  revalidatePath(`/app/${businessSlug}/settings/team`);
  return { ok: true };
}
