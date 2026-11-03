import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { apiUser } from "@/lib/auth";
import { putFile, storageReady } from "@/lib/storage";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const signedIn = await apiUser();
  if (signedIn.error) return signedIn.error;
  const formData = await req.formData();
  const kindRaw = formData.get("kind");
  const kind = kindRaw === "proof" ? "proof" : kindRaw === "signature" ? "signature" : "photo";
  // Signatures are set up in Settings, so only the super admin may upload them.
  const { error } = await apiUser(kind === "signature" ? "settings:manage" : "member:create");
  if (error) return error;
  if (!storageReady()) {
    return NextResponse.json({ error: "File storage is not configured (AWS keys missing)" }, { status: 503 });
  }

  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  const ext = ALLOWED[file.type];
  if (!ext || (kind !== "proof" && ext === "pdf")) {
    return NextResponse.json(
      { error: kind !== "proof" ? "Image must be JPG, PNG or WEBP" : "Only JPG, PNG, WEBP or PDF files are allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });

  const folder = { photo: "photos", proof: "address-proofs", signature: "signatures" }[kind];
  const key = `membership/${folder}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  try {
    await putFile(key, Buffer.from(await file.arrayBuffer()), file.type);
  } catch (e) {
    console.error("Upload failed:", e);
    return NextResponse.json({ error: "Upload failed — please try again" }, { status: 500 });
  }
  return NextResponse.json({ key }, { status: 201 });
}
