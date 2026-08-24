import "server-only";
import { prisma } from "../db";

// ---------- Helpful votes ----------

/** Toggles the caller's vote. Returns the new count and whether they now vote for it. */
export const toggleHelpful = (userId: string, experienceId: string) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.helpfulVote.findUnique({
      where: { userId_experienceId: { userId, experienceId } },
      select: { id: true },
    });

    if (existing) {
      await tx.helpfulVote.delete({ where: { id: existing.id } });
    } else {
      await tx.helpfulVote.create({ data: { userId, experienceId } });
    }

    const count = await tx.helpfulVote.count({ where: { experienceId } });
    return { voted: !existing, count };
  });

export const helpfulCounts = async (experienceIds: string[], viewerId?: string) => {
  if (experienceIds.length === 0) return new Map<string, { count: number; voted: boolean }>();

  const [counts, mine] = await Promise.all([
    prisma.helpfulVote.groupBy({
      by: ["experienceId"],
      where: { experienceId: { in: experienceIds } },
      _count: { _all: true },
    }),
    viewerId
      ? prisma.helpfulVote.findMany({
          where: { userId: viewerId, experienceId: { in: experienceIds } },
          select: { experienceId: true },
        })
      : Promise.resolve([]),
  ]);

  const voted = new Set(mine.map((m) => m.experienceId));
  const map = new Map<string, { count: number; voted: boolean }>();
  for (const id of experienceIds) map.set(id, { count: 0, voted: voted.has(id) });
  for (const c of counts) {
    map.set(c.experienceId, { count: c._count._all, voted: voted.has(c.experienceId) });
  }
  return map;
};

// ---------- Shop replies ----------

export const findReply = (experienceId: string) =>
  prisma.shopReply.findFirst({
    where: { experienceId, deletedAt: null },
    select: {
      id: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      mechanic: { select: { id: true, name: true } },
    },
  });

export const upsertReply = (data: {
  experienceId: string;
  mechanicId: string;
  authorId: string;
  body: string;
}) =>
  prisma.shopReply.upsert({
    where: { experienceId: data.experienceId },
    create: data,
    update: { body: data.body, deletedAt: null },
    select: { id: true },
  });

export const softDeleteReply = async (experienceId: string, authorId: string) => {
  const { count } = await prisma.shopReply.updateMany({
    where: { experienceId, authorId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return count > 0;
};

/** The shop a report is about, plus whether it is currently subscribing. */
export const experienceShop = (experienceId: string) =>
  prisma.mechanicExperience.findFirst({
    where: { id: experienceId, deletedAt: null },
    select: {
      id: true,
      mechanic: { select: { id: true, claimedById: true, subscriptionStatus: true } },
    },
  });

// ---------- Saved searches ----------

export const listSavedSearches = (userId: string) =>
  prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      serviceId: true,
      generationId: true,
      platformId: true,
      radiusMiles: true,
      lastNotifiedAt: true,
      createdAt: true,
    },
  });

export const createSavedSearch = (data: {
  userId: string;
  label: string;
  serviceId?: string | null;
  generationId?: string | null;
  platformId?: string | null;
  lat?: number | null;
  lng?: number | null;
  radiusMiles?: number | null;
}) => prisma.savedSearch.create({ data, select: { id: true, label: true } });

export const deleteSavedSearch = async (id: string, userId: string) => {
  const { count } = await prisma.savedSearch.deleteMany({ where: { id, userId } });
  return count > 0;
};

export const countSavedSearches = (userId: string) =>
  prisma.savedSearch.count({ where: { userId } });

/*
  New reports matching a saved search since it was last looked at. This is the
  whole alert mechanism: no background job, no queue — the comparison happens
  when the person actually asks.
*/
export const matchesForSearch = (search: {
  serviceId: string | null;
  generationId: string | null;
  platformId: string | null;
  lastNotifiedAt: Date | null;
  createdAt: Date;
}) =>
  prisma.mechanicExperience.count({
    where: {
      deletedAt: null,
      createdAt: { gt: search.lastNotifiedAt ?? search.createdAt },
      ...(search.serviceId ? { serviceId: search.serviceId } : {}),
      ...(search.generationId ? { vehicle: { generationId: search.generationId } } : {}),
      ...(search.platformId
        ? { vehicle: { generation: { platformId: search.platformId } } }
        : {}),
    },
  });

export const markSearchSeen = (id: string, userId: string) =>
  prisma.savedSearch.updateMany({ where: { id, userId }, data: { lastNotifiedAt: new Date() } });

// ---------- Work photos ----------

export const listWorkPhotos = (experienceId: string) =>
  prisma.workPhoto.findMany({
    where: { experienceId },
    select: { id: true, storageKey: true },
    orderBy: { createdAt: "asc" },
  });

export const countWorkPhotos = (experienceId: string) =>
  prisma.workPhoto.count({ where: { experienceId } });

export const addWorkPhoto = (experienceId: string, storageKey: string) =>
  prisma.workPhoto.create({ data: { experienceId, storageKey }, select: { id: true } });

export const findWorkPhoto = (id: string) =>
  prisma.workPhoto.findUnique({
    where: { id },
    select: { id: true, storageKey: true, experience: { select: { userId: true } } },
  });

export const deleteWorkPhoto = (id: string) =>
  prisma.workPhoto.delete({ where: { id }, select: { id: true } });
