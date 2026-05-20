import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { businessId } = await params;
  const { db } = await import("@/lib/db");
  const membership = await db.membership.findFirst({
    where: { businessId, userId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const logo = await db.businessLogo.findUnique({
    where: { businessId },
    select: { contentType: true, data: true, updatedAt: true },
  });
  if (!logo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(logo.data), {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": logo.contentType,
      "Last-Modified": logo.updatedAt.toUTCString(),
    },
  });
}
