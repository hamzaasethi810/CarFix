import { describe, expect, it } from "vitest";
import { inspectImage, inspectReceipt } from "../lib/storage/files";

/*
  What an attacker can get into the bucket.

  Checking the first few bytes proves how a file starts, not what it contains.
  A polyglot begins with a real image header and carries a payload after it —
  browsers that sniff, or any downstream tool that opens it, may act on the
  second half. These assert what is actually accepted rather than assuming the
  header check is the whole story.
*/

const asFile = (bytes: Uint8Array, name: string, type: string) =>
  new File([bytes as BlobPart], name, { type });

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_IEND = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const JPEG_EOI = [0xff, 0xd9];

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === "string" ? [...Buffer.from(p)] : p)),
  );

describe("things that must be refused", () => {
  it("refuses an SVG, whatever it is called", async () => {
    const svg = bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(inspectImage(asFile(svg, "avatar.png", "image/png"))).rejects.toThrow();
  });

  it("refuses HTML wearing an image filename and type", async () => {
    const html = bytes("<!doctype html><script>fetch('/api/profile',{method:'DELETE'})</script>");
    await expect(inspectImage(asFile(html, "photo.jpg", "image/jpeg"))).rejects.toThrow();
  });

  it("strips a script appended after a real PNG", async () => {
    const payload = "<script>alert(1)</script>";
    const polyglot = bytes(PNG_HEADER, "IHDRdata", PNG_IEND, payload);

    const stored = await inspectImage(asFile(polyglot, "x.png", "image/png"));

    // The image survives; the payload never reaches storage.
    expect(stored.bytes.includes(Buffer.from(payload))).toBe(false);
    expect(stored.bytes.length).toBe(polyglot.length - payload.length);
  });

  it("strips a video stapled to a JPEG, keeping the photo", async () => {
    // A Samsung motion photo is exactly this shape, and is not an attack.
    const jpg = bytes(JPEG_HEADER, "JFIFdata", JPEG_EOI, "ftypmp42\x00video-bytes");

    const stored = await inspectImage(asFile(jpg, "x.jpg", "image/jpeg"));

    expect(stored.mime).toBe("image/jpeg");
    expect(stored.bytes.includes(Buffer.from("video-bytes"))).toBe(false);
  });

  it("refuses an image with no end marker at all", async () => {
    // Not a truncation problem — it is not a PNG.
    const truncated = bytes(PNG_HEADER, "IHDR", "no end marker here");
    await expect(inspectImage(asFile(truncated, "x.png", "image/png"))).rejects.toThrow(
      /damaged or incomplete/i,
    );
  });

  it("refuses a PDF for a profile photo", async () => {
    const pdf = bytes([0x25, 0x50, 0x44, 0x46, 0x2d], "1.4", "%%EOF");
    await expect(inspectImage(asFile(pdf, "x.png", "image/png"))).rejects.toThrow();
  });
});

describe("things that must still work", () => {
  it("accepts a well-formed PNG", async () => {
    const png = bytes(PNG_HEADER, "IHDRdata", PNG_IEND);
    await expect(inspectImage(asFile(png, "x.png", "image/png"))).resolves.toMatchObject({
      mime: "image/png",
    });
  });

  it("accepts a well-formed JPEG", async () => {
    const jpg = bytes(JPEG_HEADER, "JFIFdata", JPEG_EOI);
    await expect(inspectImage(asFile(jpg, "x.jpg", "image/jpeg"))).resolves.toMatchObject({
      mime: "image/jpeg",
    });
  });

  it("accepts a PDF receipt", async () => {
    const pdf = bytes([0x25, 0x50, 0x44, 0x46, 0x2d], "1.4 body ", "%%EOF");
    await expect(inspectReceipt(asFile(pdf, "r.pdf", "application/pdf"))).resolves.toMatchObject({
      mime: "application/pdf",
    });
  });
});
