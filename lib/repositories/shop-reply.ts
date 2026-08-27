import "server-only";
import { prisma } from "../db";

/*
  All Prisma access for shop replies lives here. The service layer never
  imports `prisma` directly — see lib/services/shop-replies.ts.
*/

/**
 * The report a reply would attach to, together with the shop's owner — one
 * query, so the service can check ownership without a second round trip.
 */
export const findExperienceWithShop = (experienceId: string) =>
  prisma.mechanicExperience.findFirst({
    where: { id: experienceId, deletedAt: null },
    select: {
      id: true,
      mechanic: { select: { id: true, claimedById: true } },
    },
  });

const replySelect = {
  id: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  mechanic: { select: { id: true, name: true } },
} as const;

export const findReplyByExperience = (experienceId: string) =>
  prisma.shopReply.findUnique({
    where: { experienceId },
    select: replySelect,
  });

/**
 * Creates the one reply a report may have. Relies on the database's unique
 * constraint on `experienceId` as the final backstop against a race between
 * two concurrent requests; the service's own existence check is what turns
 * the ordinary case into a clean CONFLICT rather than a raw Prisma error.
 */
export const createReply = (data: {
  experienceId: string;
  mechanicId: string;
  authorId: string;
  body: string;
}) => prisma.shopReply.create({ data, select: replySelect });
