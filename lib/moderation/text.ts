import "server-only";
import {
  RegExpMatcher,
  TextCensor,
  asteriskCensorStrategy,
  assignIncrementingIds,
  englishDataset,
  englishRecommendedTransformers,
  keepStartCensorStrategy,
  parseRawPattern,
} from "obscenity";

/*
  Screens anything a person posts: a review, a shop description, a reply.

  Two different problems, deliberately handled differently.

  Profanity is masked rather than refused. This is a site where people report
  what a garage charged them, and somebody who was overcharged is entitled to
  be angry about it. Refusing "they did a shit job" would throw away the most
  useful reviews on the site. Masking keeps the sentiment and the detail.

  Slurs and spam are refused outright, because neither carries information
  anybody needs. The refusal names the category without repeating the term.

  The matching is word-boundary aware and whitelisted, which matters more here
  than it would elsewhere: this is a directory of real businesses in real
  towns, and a naive filter makes Scunthorpe, Penistone and Cockburn
  unpostable.
*/

export type ScreenReason = "slur" | "spam" | "link" | "embedded-file";

export type ScreenResult =
  | { ok: true; text: string }
  | { ok: false; reason: ScreenReason; message: string };

/*
  Terms refused outright. Kept as a separate list rather than taken wholesale
  from the profanity dataset, because the two need opposite treatment and the
  dataset does not grade severity.
*/
const SLUR_TERMS = [
  "nigger", "nigga", "faggot", "fag", "tranny", "retard",
  "chink", "spic", "kike", "wetback", "coon", "dyke", "gook", "paki",
];

/*
  `obscenity`'s `pattern` template tag only accepts literal text known at
  compile time, since it works by parsing the raw template strings. Our terms
  are a runtime list, so `parseRawPattern` is used instead — it parses the
  same pattern syntax from a plain string. `|word|` asserts a word boundary at
  both ends, which is what keeps this from matching "fag" inside "flag".
*/
const slurMatcher = new RegExpMatcher({
  blacklistedTerms: assignIncrementingIds(
    SLUR_TERMS.map((word) => parseRawPattern(`|${word}|`)),
  ),
  ...englishRecommendedTransformers,
});

/*
  `englishDataset` ships with a whitelist for exactly this kind of collision
  (e.g. "assess", "cockney"), but it doesn't cover every real place name.
  "Penistone" is a real town and contains "penis" as a substring, so it needs
  to be added explicitly or the town becomes unpostable.
*/
const { blacklistedTerms, whitelistedTerms } = englishDataset.build();
const profanityMatcher = new RegExpMatcher({
  blacklistedTerms,
  whitelistedTerms: [...(whitelistedTerms ?? []), "penistone"],
  ...englishRecommendedTransformers,
});

/*
  Masks with asterisks but keeps the first letter, so "shit" becomes "s***"
  rather than "****" — enough is kept that the sentence still reads as a
  sentence, not a redaction.
*/
const censor = new TextCensor().setStrategy(keepStartCensorStrategy(asteriskCensorStrategy()));

/*
  `obscenity`'s recommended transformers deliberately don't strip whitespace
  (see jo3-l/obscenity#23 and #46 — doing so globally destroys word
  boundaries and reopens the Scunthorpe problem for the whole sentence, not
  just the obfuscated word). So "s h i t" is normalised by hand before either
  matcher sees it: runs of three or more single-letter tokens get their
  spaces removed. A leading "a" or "I" is left outside the run, since those
  are real one-letter words, not spaced-out obfuscation.
*/
function collapseLetterSpacing(text: string): string {
  return text.replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, (run) => {
    const letters = run.split(/\s+/);
    let prefix = "";
    while (letters.length > 3 && /^[ai]$/i.test(letters[0])) {
      prefix += `${letters.shift()} `;
    }
    return prefix + letters.join("");
  });
}

/** Anything that looks like a link, including bare domains. */
const LINK = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|co|io|uk|shop|biz|info)\b/i;

/** A pasted image or file, the only real way to get one into a textarea. */
const DATA_URL = /data:\s*[a-z]+\/[a-z0-9.+-]+\s*;\s*base64/i;
const BASE64_RUN = /[A-Za-z0-9+/=]{200,}/;

const EMAIL = /\b[^\s@]+@[^\s@]+\.[a-z]{2,}\b/i;
const PHONE = /\b(\+?\d[\d\s().-]{7,}\d)\b/;
const CHARACTER_WALL = /(.)\1{5,}/;

const MESSAGES: Record<ScreenReason, string> = {
  slur:
    "This can't be posted as written. Please remove the offensive language and try again.",
  spam:
    "This reads as spam. Drop the promotional language and contact details, and tell us about the work instead.",
  link:
    "Links aren't allowed in posts. Describe the work rather than pointing somewhere else.",
  "embedded-file":
    "Files and images can't be pasted into a post. Please describe it in words instead.",
};

const reject = (reason: ScreenReason): ScreenResult => ({
  ok: false,
  reason,
  message: MESSAGES[reason],
});

/** Loud enough to be shouting, and long enough that it was not an acronym. */
function isShouting(text: string) {
  const letters = text.replace(/[^a-z]/gi, "");
  if (letters.length < 20) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length > 0.7;
}

export function screenText(input: string): ScreenResult {
  const text = input.trim();
  if (text === "") return { ok: true, text: "" };

  // Cheapest and least ambiguous checks first.
  if (DATA_URL.test(text) || BASE64_RUN.test(text)) return reject("embedded-file");

  // Checked ahead of the generic link check: an email address's domain
  // (e.g. "example.com" in "deals@example.com") would otherwise also match
  // the bare-domain half of LINK, misreporting contact harvesting as a link.
  if (EMAIL.test(text) || PHONE.test(text)) return reject("spam");
  if (LINK.test(text)) return reject("link");
  if (isShouting(text) || CHARACTER_WALL.test(text)) return reject("spam");

  const normalized = collapseLetterSpacing(text);
  if (slurMatcher.hasMatch(normalized)) return reject("slur");

  // Everything that survives is publishable; profanity is softened, not refused.
  const matches = profanityMatcher.getAllMatches(normalized, true);
  return { ok: true, text: censor.applyTo(normalized, matches) };
}
