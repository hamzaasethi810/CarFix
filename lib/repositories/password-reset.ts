import "server-only";
import { prisma } from "../db";

export const createResetToken = (data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  requestIp: string | null;
}) => prisma.passwordResetToken.create({ data, select: { id: true } });

export const findResetToken = (tokenHash: string) =>
  prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { id: true, email: true, deletedAt: true, totpEnabledAt: true } },
    },
  });

/** Recent unused tokens, so one address cannot be mailed repeatedly. */
export const countRecentTokens = (userId: string, since: Date) =>
  prisma.passwordResetToken.count({ where: { userId, createdAt: { gte: since } } });

/*
  Sets the new password and closes every door behind it, in one transaction:
  the token is spent, every other outstanding token for the account is spent
  too, and all sessions are invalidated. A reset is often a response to a
  compromise, so nothing the attacker already holds should survive it.
*/
export const consumeTokenAndSetPassword = (params: {
  tokenId: string;
  userId: string;
  passwordHash: string;
}) =>
  prisma.$transaction(async (tx) => {
    const spent = await tx.passwordResetToken.updateMany({
      where: { id: params.tokenId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    // Zero rows means it was already used or expired between check and write.
    if (spent.count === 0) return null;

    await tx.passwordResetToken.updateMany({
      where: { userId: params.userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await tx.user.update({
      where: { id: params.userId },
      data: { passwordHash: params.passwordHash, sessionsValidFrom: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.userId,
        action: "password.reset",
        targetType: "User",
        targetId: params.userId,
      },
    });

    return { userId: params.userId };
  });
