import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const PNG_MIME = "image/png";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// Simple in-memory rate limiting (5 uploads per minute per user)
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

  // Resolve the user's active business
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile?.activeBusinessId) {
    return NextResponse.json({ error: "No active business" }, { status: 403 });
  }

  const membership = await db.membership.findFirst({
    where: { businessId: profile.activeBusinessId, userId, status: "ACTIVE" },
  });
  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const businessId = profile.activeBusinessId;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

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
  const dir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(dir, { recursive: true });
  const filename = `${businessId}.png`;
  const filepath = path.join(dir, filename);
  await writeFile(filepath, buffer);

  const url = `/uploads/logos/${filename}`;

  const business = await db.business.update({
    where: { id: businessId },
    data: { logoUrl: url },
    select: { slug: true },
  });

  revalidatePath(`/app/${business.slug}`);
  revalidatePath(`/app/${business.slug}/settings`);
  return NextResponse.json({ url });
}
