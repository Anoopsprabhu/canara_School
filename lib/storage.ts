import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// Member photos and address proofs live in the private "canara" bucket in Neon
// Object Storage (S3-compatible, so the AWS SDK talks to it via
// AWS_ENDPOINT_URL_S3). They are never linked directly — the app streams them
// through /api/files/<key> after checking the viewer is signed in.
// Without storage keys (local dev) files go to ./.uploads instead.

const bucket = process.env.AWS_S3_BUCKET || "canara";
const useS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
const localRoot = path.join(process.cwd(), ".uploads");

let s3: S3Client | null = null;
function client() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3 || undefined;
  s3 ??= new S3Client({
    region: process.env.AWS_REGION || "ap-southeast-1",
    endpoint,
    // Neon storage only accepts path-style URLs (endpoint/bucket/key).
    forcePathStyle: !!endpoint,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return s3;
}

export function storageReady(): boolean {
  return useS3 || process.env.NODE_ENV !== "production";
}

export async function putFile(key: string, body: Buffer, contentType: string) {
  if (useS3) {
    await client().send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
    );
    return;
  }
  const file = path.join(localRoot, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
  await fs.writeFile(file + ".type", contentType);
}

export async function getFile(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    if (useS3) {
      const res = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!res.Body) return null;
      return {
        body: await res.Body.transformToByteArray(),
        contentType: res.ContentType || "application/octet-stream",
      };
    }
    const file = path.join(localRoot, key);
    if (!file.startsWith(localRoot + path.sep)) return null;
    const [body, contentType] = await Promise.all([
      fs.readFile(file),
      fs.readFile(file + ".type", "utf8").catch(() => "application/octet-stream"),
    ]);
    return { body, contentType };
  } catch {
    return null;
  }
}

export async function fileExists(key: string): Promise<boolean> {
  try {
    if (useS3) {
      await client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    }
    const file = path.join(localRoot, key);
    if (!file.startsWith(localRoot + path.sep)) return false;
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
