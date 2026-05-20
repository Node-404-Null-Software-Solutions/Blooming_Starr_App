import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveMembership } from "@/lib/authz";
import { previewSku } from "@/lib/plant-sku-service";

export async function POST(request: Request) {
  const { profile } = await requireActiveMembership();
  const businessId = profile.activeBusinessId;
  if (!businessId) {
    return NextResponse.json({ error: "No business" }, { status: 400 });
  }

  const input = await request.json();
  try {
    const result = await db.$transaction((tx) =>
      previewSku(tx, businessId, {
        plantName: input.plantName,
        categoryName: input.categoryName,
        varietyName: input.varietyName,
        suffix: input.suffix,
      })
    );

    return NextResponse.json({
      sku: result.sku,
      segments: result.segments,
      sources: result.sources,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Unable to preview SKU" },
      { status: 400 }
    );
  }
}
