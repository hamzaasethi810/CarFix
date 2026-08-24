import "server-only";

/*
  Tesseract.js — Apache-2.0, runs in this process. No API, no key, no account,
  no per-page charge, and the receipt never leaves our infrastructure, which
  matters because receipts carry names, addresses, and card fragments.

  Loaded lazily so the worker and its language data are only pulled in when a
  receipt actually arrives, rather than on every cold start.
*/

export type OcrResult = { text: string; confidence: number };

const TIMEOUT_MS = 45_000;

export async function readText(image: Buffer): Promise<OcrResult> {
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("eng");
  try {
    const result = await Promise.race([
      worker.recognize(image),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OCR timed out")), TIMEOUT_MS),
      ),
    ]);

    return {
      text: result.data.text ?? "",
      confidence: result.data.confidence ?? 0,
    };
  } finally {
    await worker.terminate();
  }
}
