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
  "prose" (the default) is a review, a bio, a reply — full sentences, where
  CHARACTER_WALL and isShouting are meaningful signals of spam. "label" is a
  name, a username, a vehicle nickname — short identity strings where a run
  of repeated characters or an all-caps word is just how someone wrote their
  handle, not spam. Slur, link, email and embedded-file checks apply to both
  equally and are never skipped.
*/
export type ScreenOptions = { mode?: "prose" | "label" };

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
  spaces removed.

  This exists purely to defeat evasion during detection — screenText only
  ever uses the result of this function to decide whether something matched,
  and to build the text it returns when something did. A clean post is
  always returned as the user wrote it, spacing included; see screenText.

  The run-matching regex cannot tell a real one-letter English word ("a",
  "I") from part of a spaced-out obfuscation it happens to sit next to, so
  without help it swallows it: "I s h i t you not" would otherwise collapse
  to "Ishit you not" instead of "I shit you not". The while-loop below peels
  a leading "a"/"I" off the front of a matched run before joining the rest,
  so that real word stays a separate token. This was cut once already as
  apparently-dead weight because the only test for it used `toContain("*")`,
  which can't tell "Is***" from "I s***" apart — see the exact-output
  "leaves a real leading word out of a spaced-out run" test below, which
  exists specifically so this can't happen again.
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

/*
  A run of digits (with spacing/punctuation) on its own is not evidence of
  spam — it's a service date, a part number, a registration, or the garage's
  own phone number, and every review on this site is about one of those. The
  distinction that matters is not "does this contain digits" but "is this
  soliciting contact": a number cited alongside phrasing like "call me" or
  "for a better price" is someone trying to move the conversation off-site;
  a number cited as a fact is ordinary review content.
*/
const PHONE = /\b(\+?\d[\d\s().-]{7,}\d)\b/;
const SOLICITATION_CUE =
  /\b(call|text|whatsapp|dm|contact|reach)\s+me\b|\bmy\s+number\b|\bfor\s+a\s+(?:better|cheaper)\s+price\b|\bcheaper\s+elsewhere\b/i;

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

/*
  Loud enough to be shouting, and long enough that it was not an acronym.
  Automotive writing is unusually acronym-dense (BMW, MOT, ABS, ECU, OBD,
  DPF, EGR...), and every one of those is short and legitimately all caps.
  Counting them toward the ratio would flag ordinary technical sentences, so
  only words longer than four characters — too long to plausibly be an
  acronym — are counted at all.
*/
function isShouting(text: string) {
  const longWords = (text.match(/[a-z]+/gi) ?? []).filter((word) => word.length > 4);
  const letters = longWords.join("");
  if (letters.length < 20) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length > 0.7;
}

export function screenText(input: string, options: ScreenOptions = {}): ScreenResult {
  const { mode = "prose" } = options;
  const text = input.trim();
  if (text === "") return { ok: true, text: "" };

  // Cheapest and least ambiguous checks first.
  if (DATA_URL.test(text) || BASE64_RUN.test(text)) return reject("embedded-file");

  // Checked ahead of the generic link check: an email address's domain
  // (e.g. "example.com" in "deals@example.com") would otherwise also match
  // the bare-domain half of LINK, misreporting contact harvesting as a link.
  // An email address in a review is almost always promotional, so it is
  // refused unconditionally; a phone number is refused only alongside a
  // solicitation cue (see SOLICITATION_CUE above) — bare digits are a date,
  // a part number or a registration far more often than they are spam.
  if (EMAIL.test(text)) return reject("spam");
  if (PHONE.test(text) && SOLICITATION_CUE.test(text)) return reject("spam");
  if (LINK.test(text)) return reject("link");
  // Written for prose: a name, a username or a vehicle nickname is not
  // shouting, and a run of repeated characters in a handle ("aaaaaaa",
  // "woooooot") is ordinary, not a character wall. Skip both for labels.
  if (mode === "prose" && (isShouting(text) || CHARACTER_WALL.test(text))) return reject("spam");

  // Normalisation is for detection only — it defeats evasion, but it is
  // never what gets stored. A clean post that happens to contain three or
  // more single-letter words in a row ("I S O a good mechanic", "M O T")
  // must come back exactly as written, not with its spacing corrupted for
  // no reason. Only when the collapsed form actually turns up a match does
  // the collapsed (and then censored) text get returned instead: a user who
  // wrote "s h i t" to dodge the filter has no claim to their exact spacing.
  const normalized = collapseLetterSpacing(text);
  if (slurMatcher.hasMatch(normalized)) return reject("slur");

  const matches = profanityMatcher.getAllMatches(normalized, true);
  if (matches.length === 0) return { ok: true, text };

  // Something was actually caught; profanity is softened, not refused.
  return { ok: true, text: censor.applyTo(normalized, matches) };
}
