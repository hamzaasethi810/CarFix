import "server-only";
import { prisma } from "../db";

export const createVerificationToken = (data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  requestIp: string | null;
}) => prisma.emailVerificationToken.create({ data });

export const findVerificationToken = (tokenHash: string) =>
  prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      usedAt: true,
      expiresAt: true,
      user: { select: { email: true, emailVerified: true } },
    },
  });

/** How many tokens this user has asked for since `since` — the resend cap. */
export const countRecentVerifications = (userId: string, since: Date) =>
  prisma.emailVerificationToken.count({
    where: { userId, createdAt: { gte: since } },
  });

/*
  Marking the token used and stamping the user is one transaction.

  Two writes that must not come apart: a verified user with a live token can
  have it replayed, and a spent token against an unverified user locks someone
  out of their own account with no way back.
*/
export const consumeTokenAndVerify = (params: { tokenId: string; userId: string }) =>
  prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: params.tokenId },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: { emailVerified: new Date() },
    }),
  ]);

/** Whether this user has confirmed their address. */
export const readVerifiedAt = (userId: string) =>
  prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
