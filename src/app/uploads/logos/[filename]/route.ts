import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getLogoUploadsDir } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safeFilename = path.basename(filename);

  if (filename !== safeFilename || !safeFilename.endsWith(".png")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const file = await readFile(path.join(getLogoUploadsDir(), safeFilename));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "image/png",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
