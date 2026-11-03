// Checks the Neon Object Storage settings in .env: writes a small test file to
// the bucket, reads it back, then deletes it.   npm run storage:check
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const { AWS_ENDPOINT_URL_S3: endpoint, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
const bucket = process.env.AWS_S3_BUCKET || "canara";
const missing = ["AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  endpoint,
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});

const Key = `membership/_storage-check-${Date.now()}.txt`;
try {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key, Body: "ok", ContentType: "text/plain" }));
  const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key }));
  const text = await got.Body.transformToString();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
  if (text !== "ok") throw new Error(`read back "${text}"`);
  console.log(`✓ Storage works: wrote, read and removed a test file in bucket "${bucket}".`);
} catch (e) {
  console.error(`✗ Storage check failed for bucket "${bucket}" at ${endpoint}:\n  ${e.name}: ${e.message}`);
  process.exit(1);
}
