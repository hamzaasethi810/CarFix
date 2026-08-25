import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BUCKETS, s3 } from "./client";

type Bucket = keyof typeof BUCKETS;

export async function putObject(bucket: Bucket, key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
      Body: body,
      ContentType: contentType,
      // Force the browser to download rather than render, so a crafted file
      // cannot execute in the storage origin.
      ContentDisposition: "attachment",
    }),
  );
}

export async function deleteObject(bucket: Bucket, key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKETS[bucket], Key: key }));
}

/**
 * Reads an object into memory so it can be served through our own origin.
 *
 * Handing a reviewer a signed storage URL meant the browser fetched the file
 * directly — and because objects are stored with `attachment`, that fetch
 * saved a permanent copy to their disk. The link expiring after 120 seconds
 * and the record being destroyed on decision then guaranteed nothing at all,
 * because the copy on disk outlived both. Serving the bytes ourselves is what
 * lets the file be shown without ever becoming a download.
 *
 * Documents are small (a receipt photo or a PDF), and the size ceiling is
 * enforced on upload, so buffering one is bounded.
 */
export async function getObjectBytes(bucket: Bucket, key: string) {
  const result = await s3.send(
    new GetObjectCommand({ Bucket: BUCKETS[bucket], Key: key }),
  );
  if (!result.Body) throw new Error("Object has no body");

  const bytes = await result.Body.transformToByteArray();
  return { bytes, contentType: result.ContentType ?? "application/octet-stream" };
}

// Buckets are private. Every read goes through a short-lived signed URL minted
// by the server for a caller it has already authorized.
export function signedReadUrl(bucket: Bucket, key: string, expiresInSeconds = 120) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKETS[bucket], Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
