import "server-only";
import { prisma } from "../db";

export const findMfaState = (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, totpSecret: true, totpEnabledAt: true, totpLastUsedAt: true },
  });

/** Stores the encrypted secret without enabling it — enrolment is not finished yet. */
export const stageSecret = (userId: string, encryptedSecret: string) =>
  prisma.user.update({
    where: { id: userId },
    data: { totpSecret: encryptedSecret, totpEnabledAt: null },
    select: { id: true },
  });

export const enableTotp = (userId: string, codes: string[]) =>
  prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { totpEnabledAt: new Date() },
    });
    // Fresh set: enabling always replaces any previous codes.
    await tx.backupCode.deleteMany({ where: { userId } });
    await tx.backupCode.createMany({
      data: codes.map((codeHash) => ({ userId, codeHash })),
    });
    return { enabled: true };
  });

export const disableTotp = (userId: string) =>
  prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabledAt: null, totpLastUsedAt: null },
    });
    await tx.backupCode.deleteMany({ where: { userId } });
  });

/**
 * Records the time step a code belonged to. Storing it is what prevents the
 * same code being replayed inside its own 30-second window.
 */
export const recordTotpUse = (userId: string, usedAt: Date) =>
  prisma.user.update({ where: { id: userId }, data: { totpLastUsedAt: usedAt }, select: { id: true } });

export const countUnusedBackupCodes = (userId: string) =>
  prisma.backupCode.count({ where: { userId, usedAt: null } });

/** Consumes a backup code if it matches an unused one. Single use by design. */
export const consumeBackupCode = async (userId: string, codeHash: string) => {
  const match = await prisma.backupCode.findFirst({
    where: { userId, codeHash, usedAt: null },
    select: { id: true },
  });
  if (!match) return false;

  const { count } = await prisma.backupCode.updateMany({
    where: { id: match.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return count > 0;
};

/** Cheap check used on the login path before asking for a code. */
export const hasMfaEnabled = async (userId: string) =>
  Boolean(
    await prisma.user.findFirst({
      where: { id: userId, totpEnabledAt: { not: null } },
      select: { id: true },
    }),
  );
