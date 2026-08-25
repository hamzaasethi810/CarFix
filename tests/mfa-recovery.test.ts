import { beforeEach, describe, expect, it } from "vitest";
import * as OTPAuth from "otpauth";
import { prisma } from "../lib/db";
import { makeUser, resetData } from "./helpers";
import { encryptSecret, hashBackupCode } from "../lib/auth/crypto";
import { generateBackupCodes, generateSecret } from "../lib/auth/totp";
import { regenerateBackupCodes, verifySecondFactor } from "../lib/services/mfa";
import { verifyPassword } from "../lib/auth/password";

/*
  Getting back in.

  Every one of these paths only ever runs for somebody who is already in
  trouble — a lost phone, a set of codes they never saw. They are the paths
  least likely to be exercised by hand and the most damaging to get wrong, so
  they are tested rather than assumed.
*/

async function enrol(role: "USER" | "ADMIN" = "USER") {
  const user = await makeUser(role);
  const secret = generateSecret();
  const codes = generateBackupCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: encryptSecret(secret), totpEnabledAt: new Date() },
  });
  await prisma.backupCode.createMany({
    data: codes.map((c) => ({ userId: user.id, codeHash: hashBackupCode(c) })),
  });
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  return { ...user, secret, codes, email: row.email };
}

const codeFor = (secret: string, label: string, offsetSteps = 0) =>
  new OTPAuth.TOTP({
    issuer: "GarageIntel", label, algorithm: "SHA1", digits: 6, period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  }).generate({ timestamp: Date.now() + offsetSteps * 30_000 });

beforeEach(resetData);

describe("issuing a fresh set of backup codes", () => {
  it("hands back a usable set", async () => {
    const user = await enrol();
    const { backupCodes } = await regenerateBackupCodes(
      user.id, codeFor(user.secret, user.email),
    );

    expect(backupCodes).toHaveLength(10);
    expect(await verifySecondFactor(user.id, backupCodes[0])).toBe(true);
  });

  it("kills the previous set", async () => {
    const user = await enrol();
    const old = user.codes[0];
    await regenerateBackupCodes(user.id, codeFor(user.secret, user.email));

    // A set written down somewhere insecure must stop working immediately.
    expect(await verifySecondFactor(user.id, old)).toBe(false);
  });

  it("refuses without a working second factor", async () => {
    const user = await enrol();
    await expect(regenerateBackupCodes(user.id, "000000")).rejects.toThrow(/not correct/i);

    // A stolen session must not be able to mint itself permanent keys.
    const remaining = await prisma.backupCode.count({ where: { userId: user.id } });
    expect(remaining).toBe(10);
    expect(await verifySecondFactor(user.id, user.codes[0])).toBe(true);
  });

  it("accepts a backup code as proof, for someone whose phone is gone", async () => {
    const user = await enrol();
    const { backupCodes } = await regenerateBackupCodes(user.id, user.codes[0]);
    expect(backupCodes).toHaveLength(10);
  });

  it("refuses when two-factor is not on at all", async () => {
    const user = await makeUser();
    await expect(regenerateBackupCodes(user.id, "123456")).rejects.toThrow(/not on/i);
  });

  it("works for an administrator, who cannot turn the factor off", async () => {
    const admin = await enrol("ADMIN");
    const { backupCodes } = await regenerateBackupCodes(
      admin.id, codeFor(admin.secret, admin.email),
    );
    expect(backupCodes).toHaveLength(10);
  });
});

describe("an operator clearing a lost authenticator", () => {
  /*
    Mirrors what `npm run admin -- reset-mfa` writes. The command itself is a
    shell script, so the behaviour that matters — that the account can actually
    be recovered afterwards — is asserted here.
  */
  async function operatorReset(userId: string) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          totpSecret: null, totpEnabledAt: null, totpLastUsedAt: null,
          sessionsValidFrom: new Date(),
        },
      });
      await tx.backupCode.deleteMany({ where: { userId } });
    });
  }

  it("leaves an admin able to sign in with their password again", async () => {
    const admin = await enrol("ADMIN");
    const before = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    await operatorReset(admin.id);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(after.totpEnabledAt).toBeNull();
    expect(after.totpSecret).toBeNull();
    // The password is untouched — this recovers the account, it does not open
    // it, and the operator never handles a credential.
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(await verifyPassword("correcthorsebattery", after.passwordHash)).toBe(true);
  });

  it("takes the old secret and every old code out of use", async () => {
    const admin = await enrol("ADMIN");
    const oldSecret = admin.secret;
    const oldCode = admin.codes[0];
    await operatorReset(admin.id);

    expect(await verifySecondFactor(admin.id, oldCode)).toBe(false);
    expect(await verifySecondFactor(admin.id, codeFor(oldSecret, admin.email))).toBe(false);
    expect(await prisma.backupCode.count({ where: { userId: admin.id } })).toBe(0);
  });

  it("signs the account out everywhere", async () => {
    const admin = await enrol("ADMIN");
    const before = new Date();
    await operatorReset(admin.id);

    // A lost authenticator is usually a lost phone, which may hold a live session.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(after.sessionsValidFrom).not.toBeNull();
    expect(after.sessionsValidFrom!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});
