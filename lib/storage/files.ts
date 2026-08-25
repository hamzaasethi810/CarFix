import "server-only";
import { randomUUID } from "node:crypto";
import { validation } from "../errors";

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/*
  A file is judged on how it starts AND how it ends.

  Checking magic bytes alone proves how a file begins, not what it contains. A
  polyglot opens with a real image header and carries a payload after the image
  data — it passes a header check, and anything downstream that sniffs content
  or opens the file may act on the second half. Requiring the file to terminate
  exactly where its format says it should means there is nowhere to hide the
  payload: bytes past the end are no longer accepted.

  Anything after the end marker is cut off rather than the whole upload being
  refused, because appended data is not always hostile — a Samsung "motion
  photo" is a JPEG with a video stapled to the end, and a person uploading one
  has done nothing wrong. Truncating serves both cases: the photo is stored and
  works, the payload does not survive, and neither outcome depends on guessing
  the uploader's intent.

  This is not a claim to detect malware. It is a narrower and achievable one:
  what lands in the bucket is a file of the declared type, ending where that
  type says it ends, with nothing carried along behind it.
*/
type Signature = {
  mime: string;
  ext: string;
  matches: (b: Uint8Array) => boolean;
  /**
   * Where this format's content ends, or -1 if it never properly ends.
   * Everything past that offset is discarded rather than stored.
   */
  endOfContent: (b: Uint8Array) => number;
};

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) =>
  sig.every((byte, i) => bytes[offset + i] === byte);

/** Offset of the last occurrence of a two-byte marker, or -1. */
const lastIndexOfPair = (b: Uint8Array, a: number, c: number) => {
  for (let i = b.length - 2; i >= 0; i--) if (b[i] === a && b[i + 1] === c) return i;
  return -1;
};

const JPEG: Signature = {
  mime: "image/jpeg",
  ext: "jpg",
  matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  // End of Image marker. Cameras and phones append all sorts after it.
  endOfContent: (b) => {
    const at = lastIndexOfPair(b, 0xff, 0xd9);
    return at === -1 ? -1 : at + 2;
  },
};
const PNG: Signature = {
  mime: "image/png",
  ext: "png",
  matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  /*
    IEND closes a PNG: the tag, then a four-byte CRC. Nothing legitimate
    follows it.
  */
  endOfContent: (b) => {
    const at = Buffer.from(b).lastIndexOf(Buffer.from([0x49, 0x45, 0x4e, 0x44]));
    return at === -1 ? -1 : at + 8;
  },
};
const WEBP: Signature = {
  mime: "image/webp",
  ext: "webp",
  matches: (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  /* RIFF states its own payload length at offset 4. */
  endOfContent: (b) => {
    if (b.length < 12) return -1;
    const declared = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
    const end = declared + 8;
    return end >= 12 && end <= b.length ? end : -1;
  },
};
const PDF: Signature = {
  mime: "application/pdf",
  ext: "pdf",
  matches: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  /* A PDF closes with %%EOF. */
  endOfContent: (b) => {
    const at = Buffer.from(b).lastIndexOf(Buffer.from("%%EOF"));
    return at === -1 ? -1 : at + 5;
  },
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
  if (!match)
    throw validation(
      "That file type is not supported. Upload a JPEG, PNG, WebP" +
        (allowed.includes(PDF) ? ", or PDF." : "."),
    );

  /*
    A file with no end marker at all is not a truncation problem — it is not a
    file of this format, so it is refused rather than trimmed.
  */
  const end = match.endOfContent(bytes);
  if (end <= 0)
    throw validation("That file looks damaged or incomplete. Re-export it and try again.");

  // Anything past the end marker never reaches storage.
  const trimmed = end < bytes.byteLength ? bytes.subarray(0, end) : bytes;

  return { bytes: Buffer.from(trimmed), mime: match.mime, ext: match.ext };
}

export const inspectImage = (file: File) => inspect(file, IMAGE_SIGNATURES, MAX_IMAGE_BYTES);
export const inspectReceipt = (file: File) => inspect(file, RECEIPT_SIGNATURES, MAX_RECEIPT_BYTES);

export const randomKey = (prefix: string, ext: string) =>
  `${prefix}/${randomUUID()}.${ext}`;
