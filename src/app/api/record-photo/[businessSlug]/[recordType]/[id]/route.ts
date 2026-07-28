import { NextResponse } from "next/server";
import { requireBusinessMembership } from "@/lib/authz";
import { createPlantIntakeRepository } from "@/lib/repositories/plant-intake";
import { createProductIntakeRepository } from "@/lib/repositories/product-intake";

export const runtime = "nodejs";

function notFoundResponse() {
  return NextResponse.json(
    { error: "Not found" },
    {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessSlug: string;
      recordType: string;
      id: string;
    }>;
  }
) {
  const { businessSlug, recordType, id } = await params;
  const { businessContext } = await requireBusinessMembership(businessSlug);

  const photo =
    recordType === "plant-intake"
      ? await createPlantIntakeRepository(businessContext).findPhotoById(id)
      : recordType === "product-intake"
        ? await createProductIntakeRepository(businessContext).findPhotoById(id)
        : null;

  if (
    !photo?.photoData ||
    !photo.photoContentType ||
    !photo.photoUpdatedAt
  ) {
    return notFoundResponse();
  }

  const etag = `"${photo.photoUpdatedAt.getTime()}-${photo.photoData.byteLength}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
        ETag: etag,
      },
    });
  }

  return new NextResponse(new Uint8Array(photo.photoData), {
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": photo.photoContentType,
      ETag: etag,
      "Last-Modified": photo.photoUpdatedAt.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
