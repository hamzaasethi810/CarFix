import "server-only";
import { geocode } from "../providers/nominatim";
import { conflict, forbidden, notFound, validation } from "../errors";
import {
  countPendingClaimsForUser,
  createClaim,
  decideClaim,
  deleteShopPrice,
  findClaim,
  findClaimById,
  listClaims,
  listShopPrices,
  listShopsForOwner,
  shopClaimedBy,
  updateShopLocation,
  upsertShopPrice,
} from "../repositories/shop";
import { mechanicExists } from "../repositories/mechanic";
import { serviceExists } from "../repositories/taxonomy";
import { writeAuditLog } from "../repositories/moderation";
import { deleteObject, getObjectBytes, putObject, signedReadUrl } from "../storage/objects";
import { inspectReceipt, randomKey } from "../storage/files";

/** One person cannot tie up the review queue with claims on many shops. */
const MAX_PENDING_CLAIMS = 3;

/*
  Claiming a shop.

  The document is proof of trading, so it is treated exactly like a receipt:
  private bucket, random key, never public, and destroyed the moment a decision
  is made. We ask to see it, we look at it, we do not keep it.
*/
export async function submitClaim(
  userId: string,
  input: {
    mechanicId: string;
    businessName: string;
    contactPhone?: string | null;
    note?: string | null;
  },
  document: File,
) {
  if (!(await mechanicExists(input.mechanicId)))
    throw validation("That shop could not be found.");

  const existing = await findClaim(userId, input.mechanicId);
  if (existing?.status === "APPROVED")
    throw conflict("You already manage this shop.");
  if (existing?.status === "PENDING")
    throw conflict("This claim is already awaiting review.");

  const pending = await countPendingClaimsForUser(userId);
  if (pending >= MAX_PENDING_CLAIMS)
    throw conflict(
      `You already have ${pending} claims awaiting review. Wait for those before submitting more.`,
    );

  // Same content checks as a receipt: magic bytes, size cap, random key.
  const { bytes, mime, ext } = await inspectReceipt(document);
  const key = randomKey(`claims/${input.mechanicId}`, ext);
  await putObject("receipts", key, bytes, mime);

  try {
    const claim = await createClaim({
      userId,
      mechanicId: input.mechanicId,
      businessName: input.businessName,
      contactPhone: input.contactPhone ?? null,
      note: input.note ?? null,
      documentKey: key,
    });

    // Replacing an earlier attempt leaves its file orphaned otherwise.
    if (existing?.documentKey && existing.documentKey !== key)
      await deleteObject("receipts", existing.documentKey);

    return { id: claim.id, status: claim.status };
  } catch (error) {
    await deleteObject("receipts", key);
    throw error;
  }
}

export async function getClaimQueue(limit: number, offset: number) {
  const rows = await listClaims("PENDING", limit, offset);
  return rows.map((c) => ({
    id: c.id,
    businessName: c.businessName,
    contactPhone: c.contactPhone,
    note: c.note,
    submittedAt: c.submittedAt.toISOString(),
    hasDocument: Boolean(c.documentKey),
    claimant: c.user.profile?.displayName ?? "Unknown",
    shop: c.mechanic,
  }));
}

/** Admin-only, short-lived, and audited — same treatment as a receipt. */
/** The trading document itself, shown in the desk rather than downloaded. */
export async function readClaimDocumentForReview(claimId: string, reviewerId: string) {
  const claim = await findClaimById(claimId);
  if (!claim?.documentKey) throw notFound();

  const { bytes, contentType } = await getObjectBytes("receipts", claim.documentKey);

  await writeAuditLog({
    actorId: reviewerId,
    action: "shopclaim.document.viewed",
    targetType: "ShopClaim",
    targetId: claimId,
  });

  return { bytes, contentType };
}

export async function getClaimDocumentUrl(claimId: string, adminId: string) {
  const claim = await findClaimById(claimId);
  if (!claim?.documentKey) throw notFound();

  const url = await signedReadUrl("receipts", claim.documentKey, 120);
  await writeAuditLog({
    actorId: adminId,
    action: "shopclaim.document.viewed",
    targetType: "ShopClaim",
    targetId: claimId,
  });

  return { url, expiresInSeconds: 120 };
}

export async function decideShopClaim(params: {
  claimId: string;
  adminId: string;
  approve: boolean;
}) {
  const claim = await findClaimById(params.claimId);
  if (!claim) throw notFound();

  const result = await decideClaim(params);
  if (!result) throw conflict("That claim has already been decided.");

  // The document is destroyed either way, exactly as a receipt is.
  if (claim.documentKey) await deleteObject("receipts", claim.documentKey);

  return { id: params.claimId, approved: params.approve };
}

// ---------- Shop management ----------

export async function getMyShops(userId: string) {
  const shops = await listShopsForOwner(userId);
  return shops.map((s) => ({
    id: s.id,
    name: s.name,
    place: [s.city, s.state].filter((p) => p && p.trim()).join(", "),
    subscriptionStatus: s.subscriptionStatus,
    subscriptionEndsAt: s.subscriptionEndsAt?.toISOString() ?? null,
  }));
}

export async function getShopPrices(mechanicId: string) {
  const rows = await listShopPrices(mechanicId);
  return rows.map((r) => ({
    serviceId: r.service.id,
    service: r.service.name,
    category: r.service.category,
    minPrice: r.minPrice,
    maxPrice: r.maxPrice,
    note: r.note,
  }));
}

export async function setShopPrice(
  mechanicId: string,
  userId: string,
  input: { serviceId: string; minPrice: number; maxPrice?: number | null; note?: string | null },
) {
  // Ownership against the database, never the request.
  if (!(await shopClaimedBy(mechanicId, userId))) throw forbidden();
  if (!(await serviceExists(input.serviceId))) throw validation("That service could not be found.");

  if (input.maxPrice != null && input.maxPrice < input.minPrice)
    throw validation("The top of the range cannot be below the bottom.");

  await upsertShopPrice({
    mechanicId,
    serviceId: input.serviceId,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice ?? null,
    note: input.note ?? null,
  });

  return getShopPrices(mechanicId);
}

/*
  Correcting where a shop actually is.

  Listings arrive from OpenStreetMap or from whoever added them, and both can
  put a business on the wrong side of the road or at an old unit. Only the
  owner who claimed it can correct it, and the new pin comes from geocoding
  the address they give — never from coordinates the browser sends, which
  would let a claimed listing be dragged anywhere on the map.
*/
export async function updateShopDetails(
  mechanicId: string,
  userId: string,
  input: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip?: string | null;
    phone?: string | null;
    website?: string | null;
  },
) {
  if (!(await shopClaimedBy(mechanicId, userId))) throw forbidden();

  const query = [input.address, input.city, input.state, input.zip].filter(Boolean).join(", ");
  const matches = await geocode(query, 1);
  if (matches.length === 0)
    throw validation("We could not find that address. Check the street, town, and postcode.");

  const place = matches[0];
  const updated = await updateShopLocation(mechanicId, {
    name: input.name.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    zip: input.zip?.trim() ?? "",
    lat: place.lat,
    lng: place.lng,
    phone: input.phone?.trim() || null,
    website: input.website?.trim() || null,
  });

  await writeAuditLog({
    actorId: userId,
    action: "shop.location.updated",
    targetType: "Mechanic",
    targetId: mechanicId,
  });

  return { ...updated, resolvedTo: place.label };
}

export async function removeShopPrice(mechanicId: string, userId: string, serviceId: string) {
  if (!(await shopClaimedBy(mechanicId, userId))) throw forbidden();
  const removed = await deleteShopPrice(mechanicId, serviceId);
  if (!removed) throw notFound();
}
