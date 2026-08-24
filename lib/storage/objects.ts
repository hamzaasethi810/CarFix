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

// Buckets are private. Every read goes through a short-lived signed URL minted
// by the server for a caller it has already authorized.
export function signedReadUrl(bucket: Bucket, key: string, expiresInSeconds = 120) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKETS[bucket], Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
