import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../env";

// S3-compatible on purpose: works against Cloudflare R2 today and MinIO or AWS
// S3 on a self-hosted deployment with no code change, only env vars.
export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export const BUCKETS = {
  photos: env.S3_BUCKET_PHOTOS,
  receipts: env.S3_BUCKET_RECEIPTS,
} as const;
