import "server-only";
import { randomUUID } from "node:crypto";
import { validation } from "../errors";

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

type Signature = { mime: string; ext: string; matches: (b: Uint8Array) => boolean };

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) =>
  sig.every((byte, i) => bytes[offset + i] === byte);

const JPEG: Signature = {
  mime: "image/jpeg",
  ext: "jpg",
  matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
};
const PNG: Signature = {
  mime: "image/png",
  ext: "png",
  matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};
const WEBP: Signature = {
  mime: "image/webp",
  ext: "webp",
  matches: (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
};
const PDF: Signature = {
  mime: "application/pdf",
  ext: "pdf",
  matches: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]),
};

const IMAGE_SIGNATURES = [JPEG, PNG, WEBP];
const RECEIPT_SIGNATURES = [JPEG, PNG, WEBP, PDF];

export type InspectedFile = { bytes: Buffer; mime: string; ext: string };

// The declared MIME type and filename are attacker-controlled, so the real type
// is decided by the file's magic bytes and the storage key is generated here.
async function inspect(file: File, allowed: Signature[], maxBytes: number): Promise<InspectedFile> {
  if (file.size === 0) throw validation("The file is empty.");
  if (file.size > maxBytes) throw validation("That file is too large.");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw validation("That file is too large.");

  const match = allowed.find((sig) => sig.matches(bytes));
  if (!match) throw validation("That file type is not supported.");

  return { bytes, mime: match.mime, ext: match.ext };
}

export const inspectImage = (file: File) => inspect(file, IMAGE_SIGNATURES, MAX_IMAGE_BYTES);
export const inspectReceipt = (file: File) => inspect(file, RECEIPT_SIGNATURES, MAX_RECEIPT_BYTES);

export const randomKey = (prefix: string, ext: string) =>
  `${prefix}/${randomUUID()}.${ext}`;
