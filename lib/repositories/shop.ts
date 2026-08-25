import "server-only";
import { prisma } from "../db";
import type { ShopClaimStatus, SubscriptionStatus } from "../generated/prisma/enums";

// ---------- Claims ----------

export const findClaim = (userId: string, mechanicId: string) =>
  prisma.shopClaim.findUnique({
    where: { userId_mechanicId: { userId, mechanicId } },
    select: { id: true, status: true, submittedAt: true, documentKey: true },
  });

export const findClaimById = (id: string) =>
  prisma.shopClaim.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      documentKey: true,
      businessName: true,
      contactPhone: true,
      note: true,
      submittedAt: true,
      userId: true,
      mechanicId: true,
      user: { select: { profile: { select: { username: true, displayName: true } } } },
      mechanic: { select: { id: true, name: true, city: true, state: true, claimedById: true } },
    },
  });

export const createClaim = (data: {
  userId: string;
  mechanicId: string;
  businessName: string;
  contactPhone?: string | null;
  note?: string | null;
  documentKey: string;
}) =>
  prisma.shopClaim.upsert({
    where: { userId_mechanicId: { userId: data.userId, mechanicId: data.mechanicId } },
    create: data,
    // Re-submitting replaces a previous rejection with a fresh request.
    update: {
      businessName: data.businessName,
      contactPhone: data.contactPhone,
      note: data.note,
      documentKey: data.documentKey,
      status: "PENDING",
      submittedAt: new Date(),
      decidedAt: null,
      decidedById: null,
    },
    select: { id: true, status: true },
  });

export const listClaims = (status: ShopClaimStatus, limit: number, offset: number) =>
  prisma.shopClaim.findMany({
    where: { status },
    select: {
      id: true,
      businessName: true,
      contactPhone: true,
      note: true,
      submittedAt: true,
      documentKey: true,
      user: { select: { profile: { select: { username: true, displayName: true } } } },
      mechanic: { select: { id: true, name: true, city: true, state: true } },
    },
    orderBy: { submittedAt: "asc" },
    take: limit,
    skip: offset,
  });

export const countPendingClaimsForUser = (userId: string) =>
  prisma.shopClaim.count({ where: { userId, status: "PENDING" } });

/*
  Approving hands the shop to the claimant and clears the document in the same
  transaction that records the decision, so the audit trail can never point at
  a file that still exists. A rejection clears it too — we asked for proof, we
  read it, we do not keep it.
*/
export const decideClaim = (params: {
  claimId: string;
  adminId: string;
  approve: boolean;
}) =>
  prisma.$transaction(async (tx) => {
    const claim = await tx.shopClaim.findUnique({
      where: { id: params.claimId },
      select: { id: true, status: true, userId: true, mechanicId: true },
    });
    if (!claim || claim.status !== "PENDING") return null;

    await tx.shopClaim.update({
      where: { id: params.claimId },
      data: {
        status: params.approve ? "APPROVED" : "REJECTED",
        documentKey: null,
        decidedAt: new Date(),
        decidedById: params.adminId,
      },
    });

    if (params.approve) {
      await tx.mechanic.update({
        where: { id: claim.mechanicId },
        data: {
          claimedById: claim.userId,
          claimedAt: new Date(),
          // A trading document is the strongest evidence there is, so an
          // approved claim confirms a provisional listing outright.
          listingStatus: "CONFIRMED",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: params.adminId,
        action: `shopclaim.${params.approve ? "approved" : "rejected"}`,
        targetType: "ShopClaim",
        targetId: params.claimId,
        metadata: { mechanicId: claim.mechanicId, claimantId: claim.userId },
      },
    });

    return { mechanicId: claim.mechanicId, userId: claim.userId };
  });

// ---------- Ownership ----------

export const shopClaimedBy = async (mechanicId: string, userId: string) =>
  Boolean(
    await prisma.mechanic.findFirst({
      where: { id: mechanicId, claimedById: userId, deletedAt: null },
      select: { id: true },
    }),
  );

export const listShopsForOwner = (userId: string) =>
  prisma.mechanic.findMany({
    where: { claimedById: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
    },
    orderBy: { name: "asc" },
  });

export const findShopBilling = (mechanicId: string) =>
  prisma.mechanic.findUnique({
    where: { id: mechanicId },
    select: {
      id: true,
      name: true,
      claimedById: true,
      listingStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
    },
  });

export const setStripeCustomer = (mechanicId: string, stripeCustomerId: string) =>
  prisma.mechanic.update({ where: { id: mechanicId }, data: { stripeCustomerId } });

/**
 * The single place subscription state is written. Entitlement is always read
 * back from these columns, never inferred from anything a browser sent.
 */
export const setSubscriptionState = (params: {
  stripeCustomerId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string | null;
  endsAt?: Date | null;
}) =>
  prisma.mechanic.updateMany({
    where: { stripeCustomerId: params.stripeCustomerId },
    data: {
      subscriptionStatus: params.status,
      ...(params.stripeSubscriptionId !== undefined
        ? { stripeSubscriptionId: params.stripeSubscriptionId }
        : {}),
      ...(params.endsAt !== undefined ? { subscriptionEndsAt: params.endsAt } : {}),
    },
  });

// ---------- Webhook replay protection ----------

/** True when this event has not been handled before, and claims it if so. */
export async function claimStripeEvent(id: string, type: string) {
  try {
    await prisma.stripeEvent.create({ data: { id, type } });
    return true;
  } catch {
    // Unique violation: Stripe redelivered something we already processed.
    return false;
  }
}

// ---------- Published prices ----------

export const listShopPrices = (mechanicId: string) =>
  prisma.shopServicePrice.findMany({
    where: { mechanicId },
    select: {
      id: true,
      minPrice: true,
      maxPrice: true,
      note: true,
      service: { select: { id: true, name: true, category: true } },
    },
    orderBy: { service: { name: "asc" } },
  });

export const upsertShopPrice = (data: {
  mechanicId: string;
  serviceId: string;
  minPrice: number;
  maxPrice: number | null;
  note: string | null;
}) =>
  prisma.shopServicePrice.upsert({
    where: { mechanicId_serviceId: { mechanicId: data.mechanicId, serviceId: data.serviceId } },
    create: data,
    update: { minPrice: data.minPrice, maxPrice: data.maxPrice, note: data.note },
    select: { id: true },
  });

export const deleteShopPrice = async (mechanicId: string, serviceId: string) => {
  const { count } = await prisma.shopServicePrice.deleteMany({ where: { mechanicId, serviceId } });
  return count > 0;
};

/**
 * Releases a claimed event id so Stripe's retry can be processed.
 *
 * The claim is taken before the work and released if the work throws;
 * otherwise a transient failure would be permanently recorded as handled and
 * the retry silently ignored.
 */
export const releaseStripeEvent = (id: string) =>
  prisma.stripeEvent.deleteMany({ where: { id } });

// ---------- Publicly submitted listings ----------

/**
 * Anything already listed close to a proposed location with a similar name.
 *
 * Duplicates are the most common failure of an open submission form — usually
 * honest, from someone who searched the wrong spelling — so the check happens
 * before anything is written rather than being cleaned up later.
 */
export const nearbyByName = (lat: number, lng: number) => {
  // ~1km box; close enough that two entries are almost certainly one business.
  const d = 0.01;
  return prisma.mechanic.findMany({
    where: {
      deletedAt: null,
      lat: { gte: lat - d, lte: lat + d },
      lng: { gte: lng - d, lte: lng + d },
    },
    select: { id: true, name: true, address: true, city: true, state: true, listingStatus: true },
    take: 25,
  });
};

/** Moves a listing's pin and postal details. Owner-only; checked in the service. */
export const updateShopLocation = (
  mechanicId: string,
  data: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
    phone: string | null;
    website: string | null;
  },
) =>
  prisma.mechanic.update({
    where: { id: mechanicId },
    data,
    select: { id: true, name: true, address: true, city: true, state: true, zip: true, lat: true, lng: true },
  });

export const createSubmittedShop = (data: {
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  submittedById: string;
}) =>
  prisma.mechanic.create({
    data: {
      ...data,
      source: "USER",
      // Visible immediately, but labelled and ineligible for the gold badge.
      listingStatus: "PROVISIONAL",
      submittedAt: new Date(),
    },
    select: { id: true, name: true, listingStatus: true },
  });

export const countSubmissionsSince = (userId: string, since: Date) =>
  prisma.mechanic.count({ where: { submittedById: userId, submittedAt: { gte: since } } });

export const listProvisionalShops = (limit: number, offset: number) =>
  prisma.mechanic.findMany({
    where: { listingStatus: "PROVISIONAL", deletedAt: null },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      phone: true,
      website: true,
      submittedAt: true,
      submittedBy: { select: { profile: { select: { displayName: true } } } },
      _count: { select: { experiences: true } },
    },
    orderBy: { submittedAt: "asc" },
    take: limit,
    skip: offset,
  });

export const setListingStatus = (params: {
  mechanicId: string;
  status: "CONFIRMED" | "REJECTED";
  actorId: string;
}) =>
  prisma.$transaction(async (tx) => {
    const updated = await tx.mechanic.updateMany({
      where: { id: params.mechanicId, listingStatus: "PROVISIONAL" },
      data: {
        listingStatus: params.status,
        // A rejected listing is hidden rather than erased, so the reports
        // attached to it are not silently destroyed along with it.
        ...(params.status === "REJECTED" ? { deletedAt: new Date() } : {}),
      },
    });
    if (updated.count === 0) return null;

    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: `listing.${params.status.toLowerCase()}`,
        targetType: "Mechanic",
        targetId: params.mechanicId,
      },
    });

    return { id: params.mechanicId };
  });

/**
 * How many different people have reported work at a shop.
 *
 * This is the corroboration signal: one person can invent a place, but
 * several independent accounts reporting real services at it is hard to fake
 * cheaply.
 */
export const distinctReportersFor = async (mechanicId: string) => {
  const rows = await prisma.mechanicExperience.findMany({
    where: { mechanicId, deletedAt: null },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.length;
};

export const promoteIfCorroborated = (mechanicId: string) =>
  prisma.mechanic.updateMany({
    where: { id: mechanicId, listingStatus: "PROVISIONAL" },
    data: { listingStatus: "CONFIRMED" },
  });
