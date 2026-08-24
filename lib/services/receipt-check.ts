import "server-only";

/*
  Automated receipt checking.

  Only two things are checked, because only two things are claimed: the shop's
  name and the total price. Everything else on a receipt is personal data we
  deliberately do not want to read or keep.

  The bias is strongly one-way:

    both match confidently  ->  approve automatically
    anything else           ->  leave it for a human

  A failed check is never a rejection. OCR misreads crumpled paper, odd fonts,
  and thermal print all the time, and a bad scan is not evidence of fraud.
  Automation exists to clear the easy majority so people are not the
  bottleneck — not to accuse anyone.
*/

/** Strip punctuation and company suffixes so "Apex Motorworks, LLC" ≈ "apex motorworks". */
const NOISE = new Set([
  "llc", "inc", "ltd", "co", "corp", "company", "the", "and", "of",
  "auto", "automotive", "service", "services", "repair", "center", "centre",
  "shop", "garage", "motors", "motor",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Tokens that actually identify a business, ignoring generic trade words. */
function distinctiveTokens(name: string): string[] {
  const all = tokenize(name);
  const distinctive = all.filter((t) => !NOISE.has(t));
  // A shop genuinely called "Auto Repair" has nothing else to match on.
  return distinctive.length > 0 ? distinctive : all;
}

export type NameMatch = { matched: boolean; matchedTokens: number; requiredTokens: number };

export function matchShopName(claimedName: string, receiptText: string): NameMatch {
  const wanted = distinctiveTokens(claimedName);
  if (wanted.length === 0) return { matched: false, matchedTokens: 0, requiredTokens: 0 };

  const haystack = tokenize(receiptText).join(" ");
  const found = wanted.filter((t) => haystack.includes(t)).length;

  /*
    One-word names must match that word. Longer names need most of their
    distinctive words, so "Apex Motorworks" is not satisfied by a receipt that
    merely says "Apex Tyres".
  */
  const required = wanted.length === 1 ? 1 : Math.ceil(wanted.length * 0.6);
  return { matched: found >= required, matchedTokens: found, requiredTokens: required };
}

/** Every money-looking figure on the receipt. */
export function extractAmounts(receiptText: string): number[] {
  const amounts: number[] = [];
  // Optional currency symbol, thousands separators, optional cents.
  const pattern = /(?:[$£€]\s?)?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2}|\d{2,6})/g;

  for (const m of receiptText.matchAll(pattern)) {
    const value = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0) amounts.push(value);
  }
  return amounts;
}

export type PriceMatch = { matched: boolean; closest: number | null };

export function matchTotal(claimedTotal: number, receiptText: string): PriceMatch {
  const amounts = extractAmounts(receiptText);
  if (amounts.length === 0) return { matched: false, closest: null };

  /*
    A cent of tolerance absorbs OCR reading "1050.00" as "1050", and nothing
    more. Widening this would let a materially different total pass.
  */
  const exact = amounts.find((a) => Math.abs(a - claimedTotal) <= 0.01);
  const closest = amounts.reduce((best, a) =>
    Math.abs(a - claimedTotal) < Math.abs(best - claimedTotal) ? a : best,
  );

  return { matched: exact !== undefined, closest };
}

export type ReceiptCheck = {
  decision: "AUTO_APPROVE" | "NEEDS_HUMAN";
  reason: string;
  name: NameMatch;
  price: PriceMatch;
  /** Confidence Tesseract reported for the page, 0-100. */
  ocrConfidence: number;
};

/** Below this the text is too unreliable to act on either way. */
const MIN_OCR_CONFIDENCE = 45;

export function evaluateReceipt(params: {
  claimedShopName: string;
  claimedTotal: number;
  receiptText: string;
  ocrConfidence: number;
}): ReceiptCheck {
  const name = matchShopName(params.claimedShopName, params.receiptText);
  const price = matchTotal(params.claimedTotal, params.receiptText);

  const base = { name, price, ocrConfidence: params.ocrConfidence };

  if (params.ocrConfidence < MIN_OCR_CONFIDENCE)
    return { ...base, decision: "NEEDS_HUMAN", reason: "The scan was too unclear to read reliably." };

  if (!name.matched)
    return { ...base, decision: "NEEDS_HUMAN", reason: "The shop name on the receipt did not clearly match." };

  if (!price.matched)
    return { ...base, decision: "NEEDS_HUMAN", reason: "The total on the receipt did not match the reported price." };

  return {
    ...base,
    decision: "AUTO_APPROVE",
    reason: "The shop name and total both matched the report.",
  };
}
