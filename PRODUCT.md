# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: US car owners who have just been quoted for a repair and do not know
whether the number is fair. The scene is a phone, in a waiting room, a driveway
or a shop forecourt, with a quote in hand and no way to check it.

Secondary, and the more likely first contributors: enthusiast owners who know
their car by chassis code rather than badge (E46, C190, R35, 997.2) and already
navigate parts catalogues, forum threads and auction listings by generation.
They are the audience for whom "priced by generation, not by badge" is not a
feature line but the whole point.

Third: shop owners, who claim an existing listing, correct its address, publish
prices and hold a paid subscription.

## Product Purpose

Record what owners actually paid a mechanic, wrap shop or tuner, indexed by
vehicle generation, so the next owner of the same car can tell a fair quote from
a bad one. Success is a filed price with a verified receipt behind it, and
enough of them per generation for a range to mean something.

## Positioning

Two claims a neighbouring product could not truthfully copy:

1. **Prices are records, not quotes.** Every figure is what somebody was
   actually charged, and the receipt is read, checked against the shop and total
   the owner entered, then destroyed. Only the confirmation is kept.
2. **The unit of identity is the generation, not the model.** A price is filed
   against a chassis generation or platform, because that is the level at which
   parts and labour actually differ.

## Operating Context

Three trades under one record: mechanical work (brakes, oil, clutches,
diagnostics), appearance work (wraps, PPF, respray) and performance work
(exhausts, tunes, kits). Appearance and performance work has no list price
anywhere, which is why owner-reported figures are the only source.

Owners arrive with a paper or emailed receipt. Shops are discovered on a map.
Enthusiasts arrive already knowing their chassis code.

## Capabilities and Constraints

Confirmed functionality: garage of owned vehicles; VIN lookup; service/price
filing with receipt upload and OCR verification; experiences with photos,
helpful votes and owner replies; map-based shop search with area and service
filters; saved searches; price check; shop claiming, location editing and price
publishing; Stripe subscriptions for shops; public profiles; admin and reviewer
consoles for claims, verifications, listings and reports.

Roles: USER, REVIEWER, ADMIN. Reviewers and admins are forced through MFA
enrolment by middleware before they can reach anything else.

Technical constraints that bind design:

- Strict CSP set in `next.config.ts`: `script-src 'self' 'unsafe-inline'`,
  `font-src 'self' data:`, `style-src 'self' 'unsafe-inline'`, `connect-src`
  limited to self, api.maptiler.com and tiles.openfreemap.org. No third-party
  CDN for fonts, scripts, styles or images. Fonts must be self-hosted through
  `next/font`. BotID is deliberately wrapped so its script is served from this
  origin rather than a vendor domain.
- Next.js 16.3.2 App Router, React 19.2.8, Tailwind v4, Prisma 7 on Postgres,
  NextAuth v5, MapLibre GL, S3 for media, Resend for mail, Upstash for rate
  limiting.
- Receipts are never retained. Only the verification outcome persists.

Terminology used throughout and worth preserving: garage, generation, platform,
experience, filing a price, shop, claim.

## Brand Commitments

Name: WrenchRates. The wordmark and the licence-plate logo are **not** binding and may
be replaced. Copy voice is **not** binding and may be rewritten.

Binding: the accessibility guarantees, and the URL structure.

- Contrast is enforced by `tests/contrast.test.ts` against `lib/design/contrast.ts`.
  Any replacement palette is held to the same tests.
- Minimum 44px touch targets on every control.
- `prefers-reduced-motion`, `prefers-reduced-transparency` and
  `prefers-contrast: more` are all honoured today and must remain so.
- Non-colour redundancy: state is carried by shape and text as well as colour.
- All 26 route slugs, nav labels, form field names and section IDs stay as they
  are, for SEO, analytics and autofill.

## Evidence on Hand

Real: shop listings, imported (see `scripts/overture-import.ts`).

Not yet real: prices, receipts, experiences, verifications. `getProofNumbers()`
returns near-zero for prices, and the landing page's proof card is explicitly
labelled as an example rather than a real price.

This is a cold-start marketplace with one seeded side. Any surface that claims
scale it does not have is lying, and any example figure shown must be labelled
as such. Empty states are primary surfaces here, not afterthoughts.

Photography on hand: `public/img/` plus supplied shots of a 992 GT3 RS and an
R35 GT-R.
