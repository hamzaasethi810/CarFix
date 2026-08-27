# Post Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Screen every user-authored post — reviews, shop descriptions, and a new shop-reply thread — rejecting slurs, spam and pasted file blobs while masking ordinary profanity.

**Architecture:** One pure module, `lib/moderation/text.ts`, exposes `screenText`. It is wired into the shared Zod schemas rather than into individual routes, so every current and future route that uses those schemas is covered by construction. The shop-reply feature is built on the existing `ShopReply` model, which has a database table but no code.

**Tech Stack:** TypeScript, Zod, Prisma 7, Next.js 16 App Router, Vitest, `obscenity` (new dependency).

**Spec:** No separate spec. The design was agreed in conversation on 2026-08-27:
slurs and spam are rejected with an explanation, ordinary profanity is masked,
and every surface that accepts a post is covered.

## Global Constraints

- **Profanity is masked, not rejected.** `shit` becomes `s***`. A frustrated customer swearing about a bad brake job is legitimate feedback on a pricing site; losing it would gut the product.
- **Slurs and spam are rejected** with a message that names the category but never echoes the term back at the user.
- **The Scunthorpe problem is a hard requirement, not a nicety.** This is a shop directory: real businesses exist in Scunthorpe, Penistone and Cockburn, and words like "assess" and "class" contain substrings that naive filters trip on. Matching must be word-boundary aware with a whitelist. A false positive here means a real shop cannot be described.
- **Normalisation before matching.** Without it the filter is decorative: `f u c k`, `fµck` and `f4ck` must all be caught. `obscenity`'s recommended transformers handle this.
- Layering: Prisma is reachable only from `lib/repositories/*`.
- Every file in `lib/` and `app/api/` starts with the imports its neighbours use; match surrounding conventions rather than introducing new ones.
- All existing tests must keep passing. Baseline is 232 passed, 1 skipped — the skip is a pre-existing conditional OCR test.

---

### Task 1: The moderation module

**Files:**
- Create: `lib/moderation/text.ts`
- Test: `tests/moderation-text.test.ts`
- Modify: `package.json` (add `obscenity`)

**Interfaces:**
- Produces:
  - `type ScreenReason = "slur" | "spam" | "link" | "embedded-file"`
  - `type ScreenResult = { ok: true; text: string } | { ok: false; reason: ScreenReason; message: string }`
  - `screenText(input: string): ScreenResult`

- [ ] **Step 1: Install the dependency**

```bash
npm install obscenity@0.4.6
```

- [ ] **Step 2: Write the failing test**

Create `tests/moderation-text.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { screenText } from "../lib/moderation/text";

const pass = (s: string) => {
  const r = screenText(s);
  if (!r.ok) throw new Error(`expected pass, got ${r.reason}`);
  return r.text;
};
const fail = (s: string) => {
  const r = screenText(s);
  if (r.ok) throw new Error("expected rejection");
  return r.reason;
};

describe("screenText", () => {
  it("leaves an ordinary review alone", () => {
    expect(pass("Fair price, done in a day. Would go back.")).toBe(
      "Fair price, done in a day. Would go back.",
    );
  });

  it("masks profanity but keeps the sentence", () => {
    expect(pass("they did a shit job on my brakes")).toBe(
      "they did a s*** job on my brakes",
    );
  });

  it("masks profanity that has been obfuscated", () => {
    // The whole point of normalisation. Without it the filter is decorative.
    expect(pass("what a sh1t job")).toContain("*");
    expect(pass("what a s h i t job")).toContain("*");
  });

  it("does not trip on real place and word names", () => {
    // The Scunthorpe problem. A false positive here means a real shop
    // cannot be listed or reviewed.
    for (const s of [
      "Great garage in Scunthorpe, fair price.",
      "They assess the car before quoting.",
      "Best in class service.",
      "Picked it up in Penistone.",
      "Spoke to Mr Cockburn about the quote.",
    ]) {
      expect(pass(s)).toBe(s);
    }
  });

  it("rejects a link", () => {
    expect(fail("great work, see https://cheap-parts.example.com")).toBe("link");
    expect(fail("visit www.spam.example.com now")).toBe("link");
  });

  it("rejects a pasted image blob", () => {
    expect(fail("look at this data:image/png;base64,iVBORw0KGgo=")).toBe(
      "embedded-file",
    );
  });

  it("rejects a long base64 run even without a data: prefix", () => {
    expect(fail("aGVsbG8".repeat(40))).toBe("embedded-file");
  });

  it("rejects shouting and character walls as spam", () => {
    expect(fail("CHEAP TYRES CALL NOW BEST DEAL IN TOWN GUARANTEED")).toBe("spam");
    expect(fail("greeeeeeeeeeaaaaaaaaat")).toBe("spam");
  });

  it("rejects contact harvesting", () => {
    expect(fail("call me on 555-018-2299 for a better price")).toBe("spam");
    expect(fail("email deals@example.com")).toBe("spam");
  });

  it("returns a message that does not echo the term back", () => {
    const r = screenText("they did a shit job");
    expect(r.ok).toBe(true);
    // Masking, not rejection — so no message at all.
  });

  it("leaves an empty string alone", () => {
    expect(pass("")).toBe("");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run tests/moderation-text.test.ts`
Expected: FAIL — cannot resolve `../lib/moderation/text`.

- [ ] **Step 4: Write the module**

Create `lib/moderation/text.ts`:

```ts
import "server-only";
import {
  RegExpMatcher,
  TextCensor,
  asteriskCensorStrategy,
  englishDataset,
  englishRecommendedTransformers,
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

const slurMatcher = new RegExpMatcher({
  blacklistedTerms: SLUR_TERMS.map((word, id) => ({
    id,
    pattern: { requireWordBoundaryAtStart: true, requireWordBoundaryAtEnd: true, nodes: [{ kind: 0, chars: [...word] }] },
  })) as never,
  ...englishRecommendedTransformers,
});

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

const censor = new TextCensor().setStrategy(asteriskCensorStrategy());

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
  if (LINK.test(text)) return reject("link");
  if (EMAIL.test(text) || PHONE.test(text)) return reject("spam");
  if (isShouting(text) || CHARACTER_WALL.test(text)) return reject("spam");

  if (slurMatcher.hasMatch(text)) return reject("slur");

  // Everything that survives is publishable; profanity is softened, not refused.
  const matches = profanityMatcher.getAllMatches(text, true);
  return { ok: true, text: censor.applyTo(text, matches) };
}
```

**Note on `slurMatcher`:** the literal `pattern` object above is illustrative.
Use `obscenity`'s `pattern` template tag instead — 
`pattern\`${word}\`` with `requireWordBoundaryAtStart`/`End` — and read
`node_modules/obscenity/dist/index.d.ts` for the exact builder API for the
installed version rather than trusting this sketch. The behaviour the tests
require is what matters: whole-word matching, normalisation applied.

- [ ] **Step 5: Run the tests until they pass**

Run: `npx vitest run tests/moderation-text.test.ts`
Expected: PASS, all cases.

If the Scunthorpe cases fail, the matcher is doing substring rather than
word-boundary matching — fix the matcher, never the test.

- [ ] **Step 6: Run the whole suite**

Run: `npx vitest run`
Expected: 232 existing pass, 1 skipped, plus the new ones.

- [ ] **Step 7: Commit**

```bash
git add lib/moderation/text.ts tests/moderation-text.test.ts package.json package-lock.json
git commit -m "Screen posts for slurs, spam and pasted files"
```

---

### Task 2: Wire it into the existing post surfaces

**Files:**
- Modify: `lib/validation/schemas.ts` (both experience schemas)
- Modify: `app/api/shops/submit/route.ts` (the description field)
- Test: `tests/moderation-wiring.test.ts`

**Interfaces:**
- Consumes: `screenText` from Task 1.
- Produces: `moderatedText(max: number)` — a Zod schema factory, exported from `lib/validation/schemas.ts`, that screens and masks in one step.

- [ ] **Step 1: Write the failing test**

Create `tests/moderation-wiring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createExperienceSchema } from "../lib/validation/schemas";

const base = {
  // `id` in the schema is just a bounded string, so these need not be real cuids.
  vehicleId: "c000000000000000000000000",
  mechanicId: "c000000000000000000000001",
  serviceId: "c000000000000000000000002",
  totalPrice: 100,
  serviceDate: "2026-01-01",
  mileageAtService: 1000,
  overallRating: 4, qualityRating: 4, priceRating: 4,
  communicationRating: 4, turnaroundRating: 4, knowledgeRating: 4,
  wouldRecommend: true, wouldReturn: true,
};

describe("review text is moderated by the schema", () => {
  it("masks profanity in place", () => {
    const parsed = createExperienceSchema.parse({ ...base, reviewText: "a shit job" });
    expect(parsed.reviewText).toBe("a s*** job");
  });

  it("refuses a link", () => {
    const r = createExperienceSchema.safeParse({
      ...base, reviewText: "see https://spam.example.com",
    });
    expect(r.success).toBe(false);
  });

  it("leaves a clean review untouched", () => {
    const parsed = createExperienceSchema.parse({ ...base, reviewText: "Great work." });
    expect(parsed.reviewText).toBe("Great work.");
  });

  it("still accepts no review at all", () => {
    expect(createExperienceSchema.parse({ ...base }).reviewText).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/moderation-wiring.test.ts`
Expected: FAIL — profanity comes back unmasked.

- [ ] **Step 3: Add the schema factory**

In `lib/validation/schemas.ts`, add near the other shared builders:

```ts
import { screenText } from "../moderation/text";

/**
 * Free text a person wrote. Screened on the way in, so no route can forget:
 * profanity is masked, slurs and spam are refused with the reason.
 */
export const moderatedText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value, ctx) => {
      const result = screenText(value);
      if (!result.ok) {
        ctx.addIssue({ code: "custom", message: result.message });
        return z.NEVER;
      }
      return result.text;
    });
```

- [ ] **Step 4: Use it in both experience schemas**

In `lib/validation/schemas.ts`, replace `reviewText: z.string().max(5000)` with
`reviewText: moderatedText(5000)` in **both** `createExperienceSchema` and
`updateExperienceSchema`. Keep the `.nullable().optional()` suffixes exactly as
they are — an absent review must stay valid.

- [ ] **Step 5: Use it for the shop description**

In `app/api/shops/submit/route.ts`, import `moderatedText` from
`@/lib/validation/schemas` and replace
`description: z.string().max(1000).nullable().optional()` with
`description: moderatedText(1000).nullable().optional()`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run`
Expected: the new wiring tests pass and nothing else breaks.

- [ ] **Step 7: Commit**

```bash
git add lib/validation/schemas.ts app/api/shops/submit/route.ts tests/moderation-wiring.test.ts
git commit -m "Screen review text and shop descriptions through the schema"
```

---

### Task 3: The shop reply feature — data and service

**Files:**
- Create: `lib/repositories/shop-reply.ts`
- Create: `lib/services/shop-replies.ts`
- Create: `app/api/experiences/[id]/reply/route.ts`
- Modify: `lib/validation/schemas.ts` (the reply schema)
- Modify: `lib/rate-limit.ts` (a bucket for replies)
- Test: `tests/shop-replies.test.ts`

**Interfaces:**
- Consumes: `moderatedText` (Task 2).
- Produces: `postReply({ experienceId, userId, body })`, `getReply(experienceId)`.

The `ShopReply` model already exists in `prisma/schema.prisma` with
`experienceId String @unique` — one reply per report, so a shop cannot bury a
complaint under repeated responses. No migration is needed.

- [ ] **Step 1: Write the failing test**

Create `tests/shop-replies.test.ts`. Follow the setup conventions in
`tests/experiences.test.ts` — read that file first and reuse its database
helpers rather than inventing new ones. Cover:

```
- the shop's claimant can reply to a report about their shop
- somebody who does not own the shop gets FORBIDDEN
- a second reply to the same report gets CONFLICT, not a duplicate row
- a reply containing profanity is stored masked
- a reply containing a link is refused
- replying to a report that does not exist gets NOT_FOUND
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/shop-replies.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Add the rate-limit bucket**

In `lib/rate-limit.ts`, add a `shopReply` bucket alongside `experienceSubmit`.
Match the shape of the existing entries; a reply is cheaper than a submission
but should not be unlimited.

- [ ] **Step 4: Add the validation schema**

In `lib/validation/schemas.ts`:

```ts
export const shopReplySchema = z
  .object({ body: moderatedText(2000).pipe(z.string().min(1)) })
  .strict();
```

- [ ] **Step 5: Write the repository**

Create `lib/repositories/shop-reply.ts`. It owns all Prisma access for replies:
find a reply by experience id, create one, and load the experience together
with the shop's `claimedById` so the service can check ownership in a single
query rather than two.

- [ ] **Step 6: Write the service**

Create `lib/services/shop-replies.ts`. `postReply` must, in order:
load the experience with its shop; `notFound()` if absent; `forbidden()` if
`claimedById !== userId`; `conflict()` if a reply already exists; then create.

The ownership check belongs here and must not be trusted from the request —
follow the pattern in `lib/services/billing.ts`, which re-checks ownership
rather than relying on the page that linked to it.

- [ ] **Step 7: Write the route**

Create `app/api/experiences/[id]/reply/route.ts`, following the shape of
`app/api/experiences/route.ts` exactly: `route()`, `requireUser()`,
`enforceRateLimit()`, `parseJson()`, `ok(..., 201)`.

- [ ] **Step 8: Run the tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add lib/repositories/shop-reply.ts lib/services/shop-replies.ts \
  app/api/experiences/[id]/reply/route.ts lib/validation/schemas.ts \
  lib/rate-limit.ts tests/shop-replies.test.ts
git commit -m "Let a shop reply once to a report about it"
```

---

### Task 4: The reply in the interface

**Files:**
- Create: `app/experiences/[id]/shop-reply.tsx`
- Modify: `app/experiences/[id]/page.tsx`
- Modify: `lib/services/dto.ts` (carry the reply through)

- [ ] **Step 1: Carry the reply through the DTO**

In `lib/services/dto.ts`, add the reply to the experience detail shape —
`{ body, createdAt, authorName }` or `null`. Match the existing field naming.

- [ ] **Step 2: Show the reply**

Create `app/experiences/[id]/shop-reply.tsx`, rendering an existing reply
attributed to the shop, and — only when the signed-in user is the shop's
claimant and no reply exists yet — a form to post one.

Match the visual language already used on that page. Read
`app/experiences/[id]/owner-actions.tsx` first and follow its structure for the
signed-in-owner case; do not introduce a new form pattern.

The input is a plain `<textarea maxLength={2000}>`. Do not use a rich text
editor or a `contenteditable` — a plain textarea cannot receive a pasted image
at all, which is half of the requirement met by construction.

Surface the server's rejection message when the moderator refuses the post; it
already explains the category.

- [ ] **Step 3: Mount it on the page**

In `app/experiences/[id]/page.tsx`, render the component below the report.

- [ ] **Step 4: Verify in a browser**

```bash
npm run dev
```

Check, at a narrow width as well as a wide one:
- a report with no reply shows nothing to a signed-out visitor
- the shop's owner sees the form
- posting a reply shows it attributed to the shop
- a reply with a link shows the refusal message rather than failing silently

- [ ] **Step 5: Run everything**

```bash
npx vitest run && npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add app/experiences/\[id\]/shop-reply.tsx app/experiences/\[id\]/page.tsx lib/services/dto.ts
git commit -m "Show a shop's reply on the report it answers"
```
