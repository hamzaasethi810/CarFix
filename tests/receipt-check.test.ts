import { describe, expect, it } from "vitest";
import { evaluateReceipt, extractAmounts, matchShopName, matchTotal } from "../lib/services/receipt-check";

const GOOD_RECEIPT = `
  APEX MOTORWORKS LLC
  3410 Pickett Rd, Fairfax VA 22031
  Brake pads + rotors        650.00
  Labor                      400.00
  Subtotal                  1050.00
  TOTAL                    $1,050.00
`;

describe("shop name matching", () => {
  it("matches despite a company suffix and casing", () => {
    expect(matchShopName("Apex Motorworks", GOOD_RECEIPT).matched).toBe(true);
  });

  it("ignores generic trade words when deciding", () => {
    // "Auto" and "Service" are too common to identify anyone.
    expect(matchShopName("Apex Auto Service", "APEX MOTORWORKS").matched).toBe(true);
  });

  it("does not match a different shop that shares a generic word", () => {
    expect(matchShopName("Apex Motorworks", "REDLINE AUTO SERVICE").matched).toBe(false);
  });

  it("does not match on one word of a multi-word name", () => {
    expect(matchShopName("Apex Motorworks", "APEX TYRES AND EXHAUST").matched).toBe(false);
  });

  it("requires the single word of a one-word name", () => {
    expect(matchShopName("Firestone", "FIRESTONE COMPLETE AUTO CARE").matched).toBe(true);
    expect(matchShopName("Firestone", "MIDAS AUTO SERVICE").matched).toBe(false);
  });
});

describe("total matching", () => {
  it("finds a total written with a currency symbol and separators", () => {
    expect(matchTotal(1050, GOOD_RECEIPT).matched).toBe(true);
  });

  it("accepts a total printed without cents", () => {
    expect(matchTotal(1050, "TOTAL 1050").matched).toBe(true);
  });

  it("rejects a total that is not on the receipt", () => {
    expect(matchTotal(1200, GOOD_RECEIPT).matched).toBe(false);
  });

  it("does not accept a nearby but different figure", () => {
    // 1050 vs 105 0 — an OCR split must not pass as a match.
    expect(matchTotal(1050, "TOTAL 105.00").matched).toBe(false);
  });

  it("pulls every money-shaped figure out of the text", () => {
    expect(extractAmounts("Parts 650.00 Labor 400.00 Total $1,050.00")).toContain(1050);
  });
});

describe("overall decision", () => {
  const base = { claimedShopName: "Apex Motorworks", claimedTotal: 1050, ocrConfidence: 90 };

  it("approves when the name and total both match", () => {
    const r = evaluateReceipt({ ...base, receiptText: GOOD_RECEIPT });
    expect(r.decision).toBe("AUTO_APPROVE");
  });

  it("defers when the price is wrong", () => {
    const r = evaluateReceipt({ ...base, claimedTotal: 2000, receiptText: GOOD_RECEIPT });
    expect(r.decision).toBe("NEEDS_HUMAN");
  });

  it("defers when the shop is wrong", () => {
    const r = evaluateReceipt({ ...base, claimedShopName: "Redline Auto", receiptText: GOOD_RECEIPT });
    expect(r.decision).toBe("NEEDS_HUMAN");
  });

  it("defers when the scan is too unclear to trust", () => {
    const r = evaluateReceipt({ ...base, receiptText: GOOD_RECEIPT, ocrConfidence: 20 });
    expect(r.decision).toBe("NEEDS_HUMAN");
  });

  it("defers on empty text rather than guessing", () => {
    const r = evaluateReceipt({ ...base, receiptText: "" });
    expect(r.decision).toBe("NEEDS_HUMAN");
  });

  /*
    The property that matters most: automation can only ever approve. Nothing
    it decides results in a rejection, so a bad scan never becomes an
    accusation against the owner.
  */
  it.each([
    ["wrong price", { claimedTotal: 9999 }],
    ["wrong shop", { claimedShopName: "Nowhere Garage" }],
    ["unreadable", { ocrConfidence: 5 }],
    ["blank", { receiptText: "" }],
  ])("never rejects — %s only defers to a human", (_label, override) => {
    const r = evaluateReceipt({ ...base, receiptText: GOOD_RECEIPT, ...override });
    expect(["AUTO_APPROVE", "NEEDS_HUMAN"]).toContain(r.decision);
    expect(r.decision).not.toBe("AUTO_REJECT");
  });
});
