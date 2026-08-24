import { beforeEach, describe, expect, it, vi } from "vitest";
import * as OTPAuth from "otpauth";
import { prisma } from "../lib/db";
import { makeUser, resetData } from "./helpers";
import { verifyPassword } from "../lib/auth/password";
import { encryptSecret } from "../lib/auth/crypto";
import { generateSecret } from "../lib/auth/totp";

// Nothing here should try to reach a mail provider.
vi.mock("../lib/providers/email", () => ({
  sendEmail: vi.fn(async () => ({ delivered: true })),
}));

const { sendEmail } = await import("../lib/providers/email");
const { completeReset, inspectToken, requestReset } = await import(
  "../lib/services/password-reset"
);

const ORIGIN = "https://carfix.test";
const NEW_PASSWORD = "a-much-longer-passphrase";

/** Pulls the raw token back out of the email we just "sent". */
function tokenFromLastEmail() {
  const calls = vi.mocked(sendEmail).mock.calls;
  const body = calls[calls.length - 1][0].text;
  const match = body.match(/reset-password\?token=([^\s]+)/);
  if (!match) throw new Error("no reset link in the email");
  return match[1];
}

async function emailOf(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return u.email;
}

beforeEach(async () => {
  await resetData();
  vi.mocked(sendEmail).mockClear();
});

describe("requesting a reset", () => {
  it("emails a link to an account that exists", async () => {
    const user = await makeUser();
    await requestReset(await emailOf(user.id), ORIGIN, null);

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(tokenFromLastEmail()).toBeTruthy();
  });

  it("says the same thing for an address with no account", async () => {
    const user = await makeUser();
    const real = await requestReset(await emailOf(user.id), ORIGIN, null);
    const fake = await requestReset("nobody@example.test", ORIGIN, null);

    // Any difference here is an account-enumeration oracle.
    expect(fake.message).toBe(real.message);
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("never stores the token in a form that could be used", async () => {
    const user = await makeUser();
    await requestReset(await emailOf(user.id), ORIGIN, null);
    const raw = tokenFromLastEmail();

    const rows = await prisma.passwordResetToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(raw);
    expect(rows[0].tokenHash).not.toContain(raw);
  });

  it("stops one address being mailed over and over", async () => {
    const user = await makeUser();
    const email = await emailOf(user.id);
    for (let i = 0; i < 8; i++) await requestReset(email, ORIGIN, null);

    expect(vi.mocked(sendEmail).mock.calls.length).toBeLessThanOrEqual(5);
  });
});

describe("completing a reset", () => {
  async function requestFor(userId: string) {
    await requestReset(await emailOf(userId), ORIGIN, null);
    return tokenFromLastEmail();
  }

  it("sets the new password", async () => {
    const user = await makeUser();
    const token = await requestFor(user.id);

    await expect(completeReset({ token, password: NEW_PASSWORD })).resolves.toEqual({ ok: true });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword(NEW_PASSWORD, after.passwordHash)).toBe(true);
  });

  it("signs every existing session out", async () => {
    const user = await makeUser();
    const before = new Date();
    const token = await requestFor(user.id);
    await completeReset({ token, password: NEW_PASSWORD });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.sessionsValidFrom).not.toBeNull();
    expect(after.sessionsValidFrom!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("works only once", async () => {
    const user = await makeUser();
    const token = await requestFor(user.id);
    await completeReset({ token, password: NEW_PASSWORD });

    await expect(completeReset({ token, password: "another-long-passphrase" })).rejects.toThrow(
      /no longer valid/i,
    );
  });

  it("voids the other outstanding links too", async () => {
    const user = await makeUser();
    const first = await requestFor(user.id);
    const second = await requestFor(user.id);

    await completeReset({ token: second, password: NEW_PASSWORD });

    // A reset is often a response to a compromise; older links must not survive.
    await expect(completeReset({ token: first, password: "yet-another-passphrase" })).rejects.toThrow(
      /no longer valid/i,
    );
  });

  it("refuses an expired link", async () => {
    const user = await makeUser();
    const token = await requestFor(user.id);
    await prisma.passwordResetToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(completeReset({ token, password: NEW_PASSWORD })).rejects.toThrow(
      /no longer valid/i,
    );
  });

  it("refuses a token nobody issued", async () => {
    await expect(
      completeReset({ token: "not-a-real-token-at-all", password: NEW_PASSWORD }),
    ).rejects.toThrow(/no longer valid/i);
  });

  it("rejects a password that is too short", async () => {
    const user = await makeUser();
    const token = await requestFor(user.id);
    await expect(completeReset({ token, password: "short" })).rejects.toThrow(/12 characters/i);
  });

  it("gives the same message whether the link expired or never existed", async () => {
    const user = await makeUser();
    const token = await requestFor(user.id);
    await prisma.passwordResetToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const expired = await completeReset({ token, password: NEW_PASSWORD }).catch((e) => e.message);
    const unknown = await completeReset({ token: "made-up-token-value", password: NEW_PASSWORD })
      .catch((e) => e.message);

    expect(expired).toBe(unknown);
  });
});

describe("accounts with a second factor", () => {
  async function makeUserWithMfa() {
    const user = await makeUser();
    const secret = generateSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: encryptSecret(secret), totpEnabledAt: new Date() },
    });
    return { ...user, secret };
  }

  function codeFor(secret: string, label: string) {
    return new OTPAuth.TOTP({
      issuer: "CarFix",
      label,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    }).generate();
  }

  it("will not reset on the strength of the email alone", async () => {
    const user = await makeUserWithMfa();
    await requestReset(await emailOf(user.id), ORIGIN, null);
    const token = tokenFromLastEmail();

    // Whoever holds the mailbox must still hold the phone.
    await expect(completeReset({ token, password: NEW_PASSWORD })).resolves.toEqual({
      ok: false,
      needsSecondFactor: true,
    });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword(NEW_PASSWORD, after.passwordHash)).toBe(false);
  });

  it("refuses a wrong code", async () => {
    const user = await makeUserWithMfa();
    await requestReset(await emailOf(user.id), ORIGIN, null);
    const token = tokenFromLastEmail();

    await expect(
      completeReset({ token, password: NEW_PASSWORD, totp: "000000" }),
    ).rejects.toThrow(/not correct/i);
  });

  it("goes through with the right code", async () => {
    const user = await makeUserWithMfa();
    const email = await emailOf(user.id);
    await requestReset(email, ORIGIN, null);
    const token = tokenFromLastEmail();

    const result = await completeReset({
      token,
      password: NEW_PASSWORD,
      totp: codeFor(user.secret, email),
    });

    expect(result).toEqual({ ok: true });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword(NEW_PASSWORD, after.passwordHash)).toBe(true);
  });

  it("says up front that a code will be needed", async () => {
    const user = await makeUserWithMfa();
    await requestReset(await emailOf(user.id), ORIGIN, null);

    expect(await inspectToken(tokenFromLastEmail())).toEqual({
      usable: true,
      needsSecondFactor: true,
    });
  });
});
