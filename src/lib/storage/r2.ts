import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

function getClient(): S3Client | null {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn("[r2] R2 credentials not configured");
    return null;
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function getBucket(bucket: "memories" | "busts"): string {
  if (bucket === "memories") return (process.env.R2_BUCKET_MEMORIES || "memory-palace-memories").trim();
  return (process.env.R2_BUCKET_BUSTS || "memory-palace-busts").trim();
}

export async function r2Upload(
  bucket: "memories" | "busts",
  path: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const s3 = getClient();
  if (!s3) throw new Error("R2 not configured");
  await s3.send(new PutObjectCommand({
    Bucket: getBucket(bucket),
    Key: path,
    Body: data,
    ContentType: contentType,
  }));
}

export async function r2Download(
  bucket: "memories" | "busts",
  path: string,
  range?: string,
): Promise<{ data: ReadableStream; contentType: string; contentLength?: number; contentRange?: string }> {
  const s3 = getClient();
  if (!s3) throw new Error("R2 not configured");
  const cmd: any = { Bucket: getBucket(bucket), Key: path };
  if (range) cmd.Range = range;
  const res = await s3.send(new GetObjectCommand(cmd));
  if (!res.Body) throw new Error("Empty response from R2");
  const stream = res.Body as ReadableStream;
  return {
    data: stream,
    contentType: res.ContentType || "application/octet-stream",
    contentLength: res.ContentLength,
    contentRange: res.ContentRange,
  };
}

export async function r2Remove(
  bucket: "memories" | "busts",
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const s3 = getClient();
  if (!s3) throw new Error("R2 not configured");
  // DeleteObjects supports up to 1000 keys per call
  for (let i = 0; i < paths.length; i += 1000) {
    const batch = paths.slice(i, i + 1000);
    await s3.send(new DeleteObjectsCommand({
      Bucket: getBucket(bucket),
      Delete: { Objects: batch.map((Key) => ({ Key })) },
    }));
  }
}

export async function r2List(
  bucket: "memories" | "busts",
  prefix: string,
): Promise<{ name: string; size: number }[]> {
  const s3 = getClient();
  if (!s3) throw new Error("R2 not configured");
  const items: { name: string; size: number }[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: getBucket(bucket),
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents || []) {
      if (obj.Key) items.push({ name: obj.Key, size: obj.Size || 0 });
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);
  return items;
}

/**
 * Generate a short-lived presigned URL for direct download from R2.
 * The browser fetches directly from Cloudflare's edge — no proxy buffering.
 */
export async function r2PresignedUrl(
  bucket: "memories" | "busts",
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const s3 = getClient();
  if (!s3) throw new Error("R2 not configured");
  const cmd = new GetObjectCommand({
    Bucket: getBucket(bucket),
    Key: path,
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
}

export function r2PublicUrl(path: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) return `${publicUrl}/${path}`;
  return `/api/media/busts/${path}`;
}

export function isR2Configured(): boolean {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
}
