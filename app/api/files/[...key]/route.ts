import { NextRequest, NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { getFile } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { error } = await apiUser();
  if (error) return error;

  const key = (await params).key.join("/");
  if (!key.startsWith("membership/") || key.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const file = await getFile(key);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(Buffer.from(file.body), {
    headers: {
      "Content-Type": file.contentType,
      // Keys are unique per upload, so the browser may cache them for good.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
