import "server-only";
import { AppError, conflict, validation } from "../errors";
import { geocode } from "../providers/nominatim";
import {
  countSubmissionsSince,
  createSubmittedShop,
  distinctReportersFor,
  listProvisionalShops,
  nearbyByName,
  promoteIfCorroborated,
  setListingStatus,
} from "../repositories/shop";

/*
  Listings added by the public.

  The honest position first: you cannot verify a business exists from a form
  submission. Anyone can type a plausible name and address. So the design does
  not pretend to — it makes a fake listing cheap to catch, worthless to
  create, and easy to remove, which is a different and achievable goal.

  Four layers, weakest to strongest:

    1. The address must geocode to a real place, and the pin is set from that
       result rather than anything the browser sent — so a submission cannot
       drop a shop somewhere it is not. Invented streets are rejected outright.
    2. The listing is PROVISIONAL. It appears, but labelled as unconfirmed, and
       it cannot hold a subscription or the gold badge — so there is no money
       or prominence to be gained by inventing one.
    3. Independent corroboration. Once several different accounts report real
       work there, it is confirmed automatically. One person can invent a
       place; several unconnected people reporting services and prices at it
       is expensive to fake.
    4. A reviewer can confirm or remove it outright, and the owner claiming it
       with a trading document confirms it immediately.
*/

/** Enough separate reporters to treat a listing as real without human review. */
const CORROBORATING_REPORTS = 3;

/** A submission cap, so a single account cannot flood the map. */
const MAX_SUBMISSIONS_PER_DAY = 5;

/*
  Two passes. The generic pass drops the words almost every shop name contains,
  so "Apex Auto Repair" and "Apex Automotive" reduce to the same thing. But it
  can strip a name down to almost nothing — "Tony's Garage" becomes "tony s" —
  and a stub like that matches far too much, so the full form is kept as well
  and the comparison uses whichever is safe.
*/
const GENERIC =
  /\b(the|and|auto|automotive|car|cars|shop|garage|service|services|repair|repairs|llc|inc|ltd|co|company)\b/g;

const clean = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const stripGeneric = (s: string) => clean(s).replace(GENERIC, " ").replace(/\s+/g, " ").trim();

/** Overlap as a proportion of the smaller name, rather than a bare count. */
function overlapRatio(a: string, b: string) {
  const wordsA = new Set(a.split(" ").filter(Boolean));
  const wordsB = new Set(b.split(" ").filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const shared = [...wordsA].filter((w) => wordsB.has(w)).length;
  return shared / Math.min(wordsA.size, wordsB.size);
}

/**
 * Whether two names are probably the same business.
 *
 * Deliberately conservative. A false positive here used to be a dead end: the
 * submission was refused outright, so somebody opening a genuinely new shop
 * next door to a similarly named one simply could not list it. Callers can now
 * override the result, and this only has to be right often enough to catch an
 * accidental re-add.
 */
export function looksLikeSameName(a: string, b: string) {
  const fullA = clean(a);
  const fullB = clean(b);
  if (!fullA || !fullB) return false;
  if (fullA === fullB) return true;

  // "Apex Motorworks" vs "Apex Motor Works" — identical once spacing is gone.
  // This is the case the whole check exists for.
  if (fullA.replace(/ /g, "") === fullB.replace(/ /g, "")) return true;

  const strippedA = stripGeneric(a);
  const strippedB = stripGeneric(b);

  /*
    Only trust the stripped form when enough of the name survives. "Tony s" is
    not evidence of anything, and treating it as a prefix match is what blocked
    "Tony's Garage" because "Tony's Tire Service" was nearby.
  */
  const distinctive = (v: string) => v.replace(/\b[a-z]\b/g, "").trim();
  const usableA = distinctive(strippedA);
  const usableB = distinctive(strippedB);
  if (usableA.length >= 4 && usableB.length >= 4) {
    if (usableA === usableB) return true;
    if (usableA.replace(/ /g, "") === usableB.replace(/ /g, "")) return true;

    /*
      Every distinctive word in the shorter name appears in the longer one —
      but only once the shorter name has at least two of them. With one word
      this rule says no more than "they share a first name", which is how
      "Tony's Garage" and "Tony's Tire Service" were treated as one business.
    */
    const countA = usableA.split(" ").filter(Boolean).length;
    const countB = usableB.split(" ").filter(Boolean).length;
    if (Math.min(countA, countB) >= 2 && overlapRatio(usableA, usableB) === 1) return true;
  }

  return false;
}

export type SubmissionInput = {
  /**
   * Set when the person has been shown a possible duplicate and confirmed it
   * is a different business. Two real shops can share a name and a plaza, so
   * this must never be a permanent refusal.
   */
  confirmDistinct?: boolean;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  state: string;
  zip?: string | null;
  phone?: string | null;
  website?: string | null;
};

export async function submitShop(userId: string, input: SubmissionInput) {
  const today = new Date(Date.now() - 24 * 3_600_000);
  const recent = await countSubmissionsSince(userId, today);
  if (recent >= MAX_SUBMISSIONS_PER_DAY)
    throw conflict(
      `You have added ${recent} shops today. Wait a day before adding more, or ask us to review the ones already in.`,
    );

  /*
    Layer 1: the address has to be a real place. Nominatim is the same free
    geocoder the area picker uses, so this costs nothing.
  */
  const query = [input.address, input.city, input.state, input.zip].filter(Boolean).join(", ");
  const matches = await geocode(query, 1);
  if (matches.length === 0)
    throw validation(
      "We could not find that address. Check the street, town, and postcode.",
    );

  const place = matches[0];

  // Layer 1b: an existing shop at the same spot with a similar name is almost
  // certainly the same business, found under a different spelling.
  const neighbours = await nearbyByName(place.lat, place.lng);
  const duplicate = neighbours.find((n) => looksLikeSameName(n.name, input.name));
  if (duplicate && !input.confirmDistinct)
    throw new AppError(
      "CONFLICT",
      `${duplicate.name} is already listed at that address. If that is the same business, ` +
        `find it on the map rather than adding it twice.`,
      // Handed back so the form can show what it matched and offer to go ahead
      // anyway — the check is a guess, and the person standing there knows better.
      { duplicate: { id: duplicate.id, name: duplicate.name }, canOverride: true },
    );

  const shop = await createSubmittedShop({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    zip: input.zip?.trim() ?? "",
    // The geocoded point, not one the browser supplied — a submitted pin could
    // put a shop anywhere.
    lat: place.lat,
    lng: place.lng,
    phone: input.phone?.trim() || null,
    website: input.website?.trim() || null,
    submittedById: userId,
  });

  return {
    id: shop.id,
    name: shop.name,
    status: shop.listingStatus,
    resolvedTo: place.label,
    message:
      "Added, and visible on the map straight away. It stays marked unconfirmed " +
      "until a few different people report work there, or the shop claims it.",
  };
}

/*
  Layer 3, run after a report is filed. Several unconnected accounts reporting
  real services at a place is the strongest cheap signal that it exists.
*/
export async function reconsiderListing(mechanicId: string) {
  const reporters = await distinctReportersFor(mechanicId);
  if (reporters < CORROBORATING_REPORTS) return { confirmed: false, reporters };

  const { count } = await promoteIfCorroborated(mechanicId);
  return { confirmed: count > 0, reporters };
}

// Layer 4: a person decides.

export async function getProvisionalQueue(limit: number, offset: number) {
  const rows = await listProvisionalShops(limit, offset);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    place: [r.address, r.city, r.state, r.zip].filter(Boolean).join(", "),
    phone: r.phone,
    website: r.website,
    submittedBy: r.submittedBy?.profile?.displayName ?? "Unknown",
    submittedAt: r.submittedAt?.toISOString() ?? null,
    reportCount: r._count.experiences,
  }));
}

export async function decideListing(params: {
  mechanicId: string;
  actorId: string;
  confirm: boolean;
}) {
  const result = await setListingStatus({
    mechanicId: params.mechanicId,
    status: params.confirm ? "CONFIRMED" : "REJECTED",
    actorId: params.actorId,
  });
  if (!result) throw conflict("That listing has already been decided.");
  return { id: params.mechanicId, confirmed: params.confirm };
}
