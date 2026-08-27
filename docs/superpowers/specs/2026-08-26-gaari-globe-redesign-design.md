# Gaari — globe landing, skeuomorphic redesign, and a real shop dataset

Date: 2026-08-26
Status: approved for planning

## Why

Two problems, and they compound.

The map is empty of the shops people actually want. OpenStreetMap is
volunteer-mapped: chains and prominent businesses get added, the two-bay
independent in a strip mall usually does not. That is the ceiling of the
source, not a bug in how it is read.

And the site looks like a template. It is a directory for people who care
about machined parts, and it is presented in the flat, weightless idiom of
every other web app. The audience notices materials. The product should
behave as though it does too.

## What this is not

Not a rewrite. The service layer, the database roles, the auth and MFA, the
receipt handling and the ownership rules all stay exactly as they are. This
changes what the front of the site is made of and where its data comes from.

---

## Part 1 — The shop dataset

### Source

**Overture Maps places**, filtered to automotive categories.

- ~74 million POIs worldwide
- CDLA Permissive 2.0 and Apache 2.0 — no share-alike, storable, ours
- ~2,300 category taxonomy, plus address, phone, website
- A per-place confidence score
- Downloadable by bounding box through DuckDB

Meta contributed roughly 58 million of those records. That is where the small
independents live, and it is why this fixes the coverage problem that OSM
cannot.

### Why not Google

Checked against their terms rather than assumed. Google Maps Platform forbids
displaying Places data on a non-Google map, caps caching at 30 days, and
prohibits caching for the purpose of building a competing database. Gaari
would be doing all three. The risk is not a fine, it is a key revoked without
notice — and a directory whose data can be switched off by someone else is not
a business. Cost would have bitten separately: roughly $32 per 1,000 Nearby
Search requests.

### Scope and size

Measured against the real table: **565 bytes per shop including indexes**.

| Coverage | Shops | Storage |
|---|---|---|
| Virginia | ~12,000 | ~7 MB |
| United States | ~300,000 | ~170 MB |
| Neon free tier | | 512 MB |

Import Virginia first and measure the real figure — Overture records carry more
fields than the OSM rows that number came from. If it lands near the estimate,
import the whole country: an empty map for a visitor from the next state over
is the thing that kills a directory on first impression.

### Query cost

Non-issue, and measured rather than assumed. With 300,000 shops loaded, a
20-mile search returned in **3.3 ms**, touching 86 rows via
`Mechanic_lat_lng_idx`. The search is bounded by a geographic box before any
distance maths runs, so shops in Texas cost nothing to a search in Arlington.

### Pipeline

A script, run by an operator, not a request path:

1. Pull the Overture places extract for a bounding box via DuckDB
2. Keep automotive categories; drop anything below a confidence threshold
3. Deduplicate against existing shops on name proximity and location, reusing
   the matcher already written for user submissions
4. Bulk insert with `source = 'OVERTURE'` and the Overture GERS id as
   `sourceRef`, so re-imports update rather than duplicate

OSM ingestion stays as a second source and merges. User submissions are
untouched.

---

## Part 2 — The landing

### The globe

MapLibre GL with globe projection, NASA Blue Marble imagery. Centred. It
drifts, it spins under a drag with momentum, and it costs nothing to look at —
the texture is a static public-domain image, not metered tiles.

Over it: the wordmark and one control, **Nearby**. No filter bar, no cards.

**The globe must sit in the scene, not on top of it.** A photoreal sphere
pasted onto a flat fill is the single clearest tell of a thrown-together site,
and it is what this design must not look like. Two things prevent it, and both
are required:

- The ground behind it is textured, never a flat colour — see Ground below.
- The globe carries a grounding shadow: a soft ambient occlusion pooling
  beneath and around it, darkest at the contact point and falling off outward,
  plus a faint rim light on the lit edge. The shadow belongs to the page, not
  to the map canvas, so it must be rendered behind the globe element rather
  than drawn into the tile.

Judge it by squinting: the globe and the ground should read as one photograph,
not as two layers.

### The descent

Nearby → geolocation → the camera flies from orbit to the visitor's city.

The flight happens entirely over the NASA texture. MapTiler is not touched
until the final second, when street tiles fade in beneath the settling camera.

This is a cost decision as much as an aesthetic one. A naive descent streams
tiles through every zoom level it crosses — 200 to 400 of them — and MapTiler's
free tier is 100,000 requests a month, after which **service pauses until the
1st**. Flying over the texture and loading only on arrival costs 20 to 30, which
is the difference between a few hundred visits a month and a few thousand.

Refused geolocation keeps the globe and opens the area picker instead; naming a
town flies there the same way.

### The lock

On arrival the map is bounded to the searched radius. Panning rubber-bands at
the edge rather than stopping dead, so it reads as deliberate. Moving elsewhere
is done through Nearby or the area picker, which re-centres and re-locks.

This matches what the product does — shops within a radius of a point — and it
is what keeps a curious visitor from spending the month's tile budget dragging
across the country.

---

## Part 3 — Materials

Skeuomorphic, because the audience is people who can tell cast from machined.
The rule: every surface should look like it is made of something.

### Ground

Deep forest green with real texture — a fine brushed grain and a soft vignette,
not a flat fill. Chrome, navigation and the map sit on it.

The texture is load-bearing, not decoration. It is what gives the globe
something to sit against; over a flat fill the globe reads as a sticker
regardless of how good the sphere itself looks. If the grain is so subtle it
cannot be seen at arm's length on a normal monitor, it is too subtle — raise it
until the ground obviously has a surface.

### Work surfaces

Anything read or typed into sits on a raised lighter panel. This is the part
that keeps a dark theme from looking cheap: unreadable form fields are what
sink these designs, and the fix is not to fight contrast but to lift the
content onto its own surface.

### Buttons — machined aluminium

Horizontal brush pattern, bright top edge, dark bottom edge, a specular band
that travels on hover. Pressing depresses. No pills anywhere; the current
`rounded-full` treatment goes.

The brush runs horizontally, across the long axis, and deliberately against the
ground's vertical grain. Perpendicular grain is what makes the button read as a
different material from the surface it sits on; matching the ground's direction
makes it blend into it. This is a change from the original "vertical" wording,
decided on 2026-08-27 after looking at both.

### Type

White, condensed, mechanical — the register of workshop signage and gauge
faces.

---

## Part 4 — Motion

### Arrival

The mechanic list slides in from the **left**, the filter rail from the
**right**, staggered rather than together, so the interface reads as assembling.

### The shop popout

A pin opens a card that rises out of the map and tilts toward the cursor —
parallax across its surface, light travelling with it. On touch the tilt
follows the drag. Under `prefers-reduced-motion` it simply appears.

### Responsive behaviour

The direction of travel is constant everywhere. What changes is whether both
rails can exist at once.

| | Landing | On arrival |
|---|---|---|
| **Desktop** ≥1024 | Globe centred | List left and filters right, both persistent, map between |
| **Tablet** 640–1023 | Globe centred | List left persistent; filters overlay from the right |
| **Phone** <640 | Globe fills screen | List rises as a sheet; filters full-height from the right |

Two opposing rails do not fit on a phone, and a tablet in portrait would be
left with a letterboxed map. Sequential rather than simultaneous, same
directions, same motion language.

Verified in a real browser at every breakpoint and both orientations before any
of it is called done.

---

## Part 5 — Cookies

Preferences first, because that is the part people feel: last area, filters,
list state. A returning visitor lands in their own city without asking.

Storing preferences is what creates the obligation, so a consent control
follows — a slim bar in the same material as everything else, not a wall. The
session cookie remains strictly necessary and needs no permission.

---

## Part 6 — Admin and review

Plain. The dark shell so they do not look broken, and nothing else. No globe,
no descent, no parallax. They are tools used by a handful of people, and effort
spent there is effort not spent on the part everyone sees.

---

## Guardrails

- **Usability is not traded for looks.** Every interactive target is at least
  44pt in both axes, keyboard focus stays visible on every control, and body
  text holds WCAG AA against whatever surface it sits on. An automated contrast
  check enforces the last of these; the first two are checked in the browser.
  A skeuomorphic surface that is hard to use has failed, however good it looks.
- **No bubbles.** Radii stay small and even — a milled edge, not a pebble.
  Pill-shaped controls are out entirely. Round is allowed only where the thing
  is genuinely a circle: an avatar, a status dot, a spinner.
- **`prefers-reduced-motion`** disables the descent, the stagger and the tilt.
  Nothing becomes unreachable; things simply appear.
- **Slow connections** skip the globe entirely and land on the map.
- **First visit** gets the globe. Returning visitors go straight to their
  remembered area — nobody wants a cinematic on their fourth price check.
- **Tile budget** is the operational risk. The descent must never stream
  through zoom levels. If MapTiler is exhausted the map goes blank, so the
  source stays a single config value and OpenFreeMap remains the fallback.

## What stays untouched

Auth, MFA and the reviewer role. Receipt handling and destruction. Ownership
checks. Rate limiting. The database role split. The layered architecture and
the lint rules that enforce it. All 206 tests must still pass.

## Build order

1. **Overture pipeline** — the redesign is worth little over an empty map
2. **Materials** — ground, surfaces, buttons, type
3. **Globe and descent**
4. **Motion** — arrival, popout, and the filter and zoom-control fixes that
   fall out of rebuilding that surface

## Open risks

- **Overture record size** is estimated from OSM rows. Measure Virginia before
  committing to the country.
- **Globe performance on mid-range Android** is the most likely disappointment.
  Budget a lower-resolution texture on small screens and be willing to drop the
  globe rather than ship something that stutters.
- **OpenFreeMap as fallback** is run on donated infrastructure with no uptime
  guarantee. Acceptable as a fallback, not as the default.
