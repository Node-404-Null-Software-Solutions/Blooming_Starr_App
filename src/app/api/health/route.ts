import { NextResponse } from "next/server";

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    const { db } = await import("@/lib/db");
    await db.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({
      status: "ok",
      database: "ok",
      checkedAt,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        database: "error",
        checkedAt,
      },
      { status: 503 }
    );
  }
}
