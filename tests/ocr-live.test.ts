import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateReceipt } from "../lib/services/receipt-check";

const IMAGE = process.env.OCR_FIXTURE;

// Opt-in: runs real OCR, which is slow, so it only fires when a fixture is given.
describe.skipIf(!IMAGE || !existsSync(IMAGE))("OCR against a real receipt image", () => {
  it("reads the receipt and approves only the truthful claim", async () => {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const { data } = await worker.recognize(readFileSync(IMAGE!));
    await worker.terminate();

    console.log("\n--- OCR text ---\n" + data.text.trim());
    console.log("confidence:", Math.round(data.confidence));

    const truthful = evaluateReceipt({
      claimedShopName: "Apex Motorworks",
      claimedTotal: 1050,
      receiptText: data.text,
      ocrConfidence: data.confidence,
    });
    console.log("truthful claim ->", truthful.decision, "|", truthful.reason);

    const inflated = evaluateReceipt({
      claimedShopName: "Apex Motorworks",
      claimedTotal: 2000,
      receiptText: data.text,
      ocrConfidence: data.confidence,
    });
    console.log("inflated price ->", inflated.decision, "|", inflated.reason);

    const wrongShop = evaluateReceipt({
      claimedShopName: "Redline Auto Service",
      claimedTotal: 1050,
      receiptText: data.text,
      ocrConfidence: data.confidence,
    });
    console.log("wrong shop    ->", wrongShop.decision, "|", wrongShop.reason);

    expect(truthful.decision).toBe("AUTO_APPROVE");
    expect(inflated.decision).toBe("NEEDS_HUMAN");
    expect(wrongShop.decision).toBe("NEEDS_HUMAN");
  }, 120_000);
});
