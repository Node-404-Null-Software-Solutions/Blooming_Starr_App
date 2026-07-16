import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireBusinessMembership } from "@/lib/authz";
import { previewSku } from "@/lib/plant-sku-service";

export async function POST(request: Request) {
  const input = await request.json();
  if (!input.businessSlug || typeof input.businessSlug !== "string") {
    return NextResponse.json({ error: "Business is required" }, { status: 400 });
  }
  const { business } = await requireBusinessMembership(input.businessSlug);
  const businessId = business.id;
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
