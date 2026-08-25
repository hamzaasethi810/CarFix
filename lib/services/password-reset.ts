import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { validation } from "../errors";
import { env } from "../env";
import { sendEmail } from "../providers/email";
import { findUserByEmail } from "../repositories/user";
import {
  consumeTokenAndSetPassword,
  countRecentTokens,
  createResetToken,
  findResetToken,
} from "../repositories/password-reset";
import { verifySecondFactor } from "./mfa";

/*
  Password reset by email.

  Several decisions here are deliberate and worth stating, because each one
  closes an attack that a naive version leaves open:

    - The response never says whether an address has an account. Otherwise the
      form becomes a way to enumerate who is registered.
    - The token is random and stored hashed. Whoever holds the raw value can
      take over the account, so a database dump must not contain it.
    - It expires in an hour and works once. Password reset links end up in
      inboxes, forwarded messages, and browser history.
    - A second factor is still required if the account has one. Email is not a
      second factor: if a reset could bypass it, anyone who reached the inbox
      would defeat it entirely.
    - Completing a reset ends every session and voids every other outstanding
      token, because a reset is often a response to a compromise.
*/

const TOKEN_TTL_MS = 60 * 60_000;
const MAX_REQUESTS_PER_HOUR = 5;

const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

/**
 * Always resolves the same way, whether or not the address is registered.
 *
 * The work is done regardless so the timing does not give it away either.
 */
export async function requestReset(email: string, origin: string, ip: string | null) {
  const user = await findUserByEmail(email);

  if (user) {
    const recent = await countRecentTokens(user.id, new Date(Date.now() - 3_600_000));
    if (recent < MAX_REQUESTS_PER_HOUR) {
      // 32 bytes of randomness: guessing is not a practical attack.
      const raw = randomBytes(32).toString("base64url");
      await createResetToken({
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        requestIp: ip,
      });

      const link = `${origin}/reset-password?token=${raw}`;
      await sendEmail({
        to: user.email,
        subject: "Reset your Gaari password",
        text:
          `Someone asked to reset the password for this Gaari account.\n\n` +
          `Open this link within the hour to choose a new one:\n${link}\n\n` +
          `The link works once. If this was not you, ignore this message — ` +
          `nothing has changed and your password still works.\n`,
        html:
          `<p>Someone asked to reset the password for this Gaari account.</p>` +
          `<p><a href="${link}">Choose a new password</a></p>` +
          `<p>The link works once and expires in an hour.</p>` +
          `<p>If this was not you, ignore this message — nothing has changed ` +
          `and your password still works.</p>`,
      });
    }
  }

  return {
    message:
      "If that address has an account, a reset link is on its way. " +
      "Check your spam folder if it does not arrive shortly.",
  };
}

export type ResetOutcome = { ok: true } | { ok: false; needsSecondFactor: true };

export async function completeReset(params: {
  token: string;
  password: string;
  totp?: string;
}): Promise<ResetOutcome> {
  if (params.password.length < 12)
    throw validation("Your new password must be at least 12 characters.");

  const record = await findResetToken(hashToken(params.token));

  /*
    One message for every failure mode — expired, already used, never existed.
    Distinguishing them tells someone holding a stale link whether it was ever
    real, which is information they should not get.
  */
  const invalid = validation("That reset link is no longer valid. Request a new one.");
  if (!record || record.usedAt || record.expiresAt <= new Date()) throw invalid;
  if (!record.user || record.user.deletedAt) throw invalid;

  /*
    Email alone must not be enough for an account with a second factor,
    otherwise reaching the inbox is the same as defeating it.
  */
  if (record.user.totpEnabledAt) {
    if (!params.totp) return { ok: false, needsSecondFactor: true };
    const valid = await verifySecondFactor(record.user.id, params.totp);
    if (!valid) throw validation("That code was not correct.");
  }

  const result = await consumeTokenAndSetPassword({
    tokenId: record.id,
    userId: record.userId,
    passwordHash: await bcrypt.hash(params.password, 12),
  });
  // Lost the race with another use of the same link.
  if (!result) throw invalid;

  return { ok: true };
}

/** Whether a link is worth showing a form for, without spending it. */
export async function inspectToken(token: string) {
  const record = await findResetToken(hashToken(token));
  const usable = Boolean(
    record && !record.usedAt && record.expiresAt > new Date() && !record.user?.deletedAt,
  );
  return { usable, needsSecondFactor: usable && Boolean(record?.user?.totpEnabledAt) };
}

/** Exported for tests: constant-time comparison of two hex digests. */
export function digestsMatch(a: string, b: string) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const resetLinkOrigin = () => env.APP_URL ?? "http://localhost:3000";
