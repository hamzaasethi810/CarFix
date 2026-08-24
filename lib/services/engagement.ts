import "server-only";
import { conflict, forbidden, notFound, validation } from "../errors";
import {
  addWorkPhoto,
  countSavedSearches,
  countWorkPhotos,
  createSavedSearch,
  deleteSavedSearch,
  deleteWorkPhoto,
  experienceShop,
  helpfulCounts,
  findReply,
  findWorkPhoto,
  listSavedSearches,
  listWorkPhotos,
  markSearchSeen,
  matchesForSearch,
  softDeleteReply,
  toggleHelpful,
  upsertReply,
} from "../repositories/engagement";
import { experienceBelongsTo } from "../repositories/experience";
import { deleteObject, putObject, signedReadUrl } from "../storage/objects";
import { inspectImage, randomKey } from "../storage/files";

const MAX_SAVED_SEARCHES = 20;
const MAX_WORK_PHOTOS = 4;

// ---------- Helpful votes ----------

/**
 * Voting is a toggle, so a second press removes the vote. The database holds
 * the uniqueness constraint, so a double-submitted request cannot inflate a
 * count.
 */
export async function voteHelpful(userId: string, experienceId: string) {
  // Marking your own report helpful would be meaningless.
  if (await experienceBelongsTo(experienceId, userId))
    throw conflict("You cannot mark your own report helpful.");

  return toggleHelpful(userId, experienceId);
}

// ---------- Shop replies ----------

export async function getReply(experienceId: string) {
  const reply = await findReply(experienceId);
  if (!reply) return null;
  return {
    id: reply.id,
    body: reply.body,
    createdAt: reply.createdAt.toISOString(),
    edited: reply.updatedAt.getTime() - reply.createdAt.getTime() > 1000,
    shop: reply.mechanic,
  };
}

/**
 * Replying is a subscriber feature, and only for the shop the report is about.
 * Both conditions are checked against the database, never the request.
 */
export async function replyToExperience(experienceId: string, userId: string, body: string) {
  const experience = await experienceShop(experienceId);
  if (!experience) throw notFound();

  const { mechanic } = experience;
  if (mechanic.claimedById !== userId) throw forbidden();
  if (mechanic.subscriptionStatus !== "ACTIVE")
    throw conflict("Replying to reviews is part of the shop subscription.");

  await upsertReply({ experienceId, mechanicId: mechanic.id, authorId: userId, body });
  return getReply(experienceId);
}

export async function removeReply(experienceId: string, userId: string) {
  const removed = await softDeleteReply(experienceId, userId);
  if (!removed) throw notFound();
}

// ---------- Saved searches ----------

export async function getSavedSearches(userId: string) {
  const searches = await listSavedSearches(userId);

  // Each row carries how many new reports have appeared since it was last read.
  const withCounts = await Promise.all(
    searches.map(async (s) => ({
      id: s.id,
      label: s.label,
      radiusMiles: s.radiusMiles,
      createdAt: s.createdAt.toISOString(),
      newSinceLastVisit: await matchesForSearch(s),
    })),
  );

  return withCounts;
}

export async function saveSearch(
  userId: string,
  input: {
    label: string;
    serviceId?: string | null;
    generationId?: string | null;
    platformId?: string | null;
    lat?: number | null;
    lng?: number | null;
    radiusMiles?: number | null;
  },
) {
  const count = await countSavedSearches(userId);
  if (count >= MAX_SAVED_SEARCHES)
    throw conflict(`You can keep up to ${MAX_SAVED_SEARCHES} saved searches.`);

  if (!input.serviceId && !input.generationId && !input.platformId)
    throw validation("Pick at least a service or a car to watch.");

  return createSavedSearch({ userId, ...input });
}

export async function removeSavedSearch(id: string, userId: string) {
  const removed = await deleteSavedSearch(id, userId);
  if (!removed) throw notFound();
}

export async function markSeen(id: string, userId: string) {
  await markSearchSeen(id, userId);
}

// ---------- Work photos ----------

export async function getWorkPhotos(experienceId: string) {
  const photos = await listWorkPhotos(experienceId);
  // Keys never leave the server; the id is what the media route resolves.
  return photos.map((p) => ({ id: p.id, url: `/api/media/work/${p.id}` }));
}

export async function uploadWorkPhoto(experienceId: string, userId: string, file: File) {
  if (!(await experienceBelongsTo(experienceId, userId))) throw forbidden();

  const count = await countWorkPhotos(experienceId);
  if (count >= MAX_WORK_PHOTOS)
    throw conflict(`A report can carry up to ${MAX_WORK_PHOTOS} photos.`);

  const { bytes, mime, ext } = await inspectImage(file);
  const key = randomKey(`work/${experienceId}`, ext);
  await putObject("photos", key, bytes, mime);

  try {
    const photo = await addWorkPhoto(experienceId, key);
    return { id: photo.id, url: `/api/media/work/${photo.id}` };
  } catch (error) {
    await deleteObject("photos", key);
    throw error;
  }
}

export async function removeWorkPhoto(photoId: string, userId: string) {
  const photo = await findWorkPhoto(photoId);
  if (!photo) throw notFound();
  if (photo.experience.userId !== userId) throw forbidden();

  await deleteWorkPhoto(photoId);
  await deleteObject("photos", photo.storageKey);
}

export async function workPhotoUrl(photoId: string) {
  const photo = await findWorkPhoto(photoId);
  if (!photo) throw notFound();
  return signedReadUrl("photos", photo.storageKey, 300);
}

/** Helpful count and whether this viewer has voted, for one report. */
export async function getHelpful(experienceId: string, viewerId?: string) {
  const map = await helpfulCounts([experienceId], viewerId);
  return map.get(experienceId) ?? { count: 0, voted: false };
}

/**
 * Whether this viewer may reply as the shop: they must own it, and it must be
 * subscribing. Both read from the database.
 */
export async function canReplyAsShop(experienceId: string, viewerId?: string) {
  if (!viewerId) return false;
  const experience = await experienceShop(experienceId);
  return (
    experience?.mechanic.claimedById === viewerId &&
    experience?.mechanic.subscriptionStatus === "ACTIVE"
  );
}
