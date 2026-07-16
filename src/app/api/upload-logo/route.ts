import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const PNG_MIME = "image/png";
const MAX_SIZE = 2 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const uploadCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();

  for (const [key, value] of uploadCounts) {
    if (now > value.resetAt) {
      uploadCounts.delete(key);
    }
  }

  const entry = uploadCounts.get(userId);
  if (!entry || now > entry.resetAt) {
    uploadCounts.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: "Too many uploads. Try again in a minute." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const businessSlug = String(formData.get("businessSlug") ?? "").trim();
  if (!businessSlug) {
    return NextResponse.json({ error: "Business is required" }, { status: 400 });
  }

  const { db } = await import("@/lib/db");
  const membership = await db.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      business: { slug: businessSlug },
    },
    select: { businessId: true, role: true },
  });
  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const businessId = membership.businessId;

  const file = formData.get("file") ?? formData.get("logo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  if (file.type !== PNG_MIME) {
    return NextResponse.json(
      { error: "Only PNG images are allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be under 2MB" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = `/api/business-logo/${businessId}?v=${Date.now()}`;

  const business = await db.$transaction(async (tx) => {
    await tx.businessLogo.upsert({
      where: { businessId },
      create: {
        businessId,
        contentType: PNG_MIME,
        data: buffer,
      },
      update: {
        contentType: PNG_MIME,
        data: buffer,
      },
    });

    return tx.business.update({
      where: { id: businessId },
      data: { logoUrl: url },
      select: { slug: true },
    });
  });

  revalidatePath(`/app/${business.slug}`);
  revalidatePath(`/app/${business.slug}/settings`);
  return NextResponse.json({ url });
}
