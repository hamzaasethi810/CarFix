import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../env";
import { AppError } from "../errors";
import { mailConfigured, sendEmail } from "../providers/email";
import {
  consumeTokenAndVerify,
  countRecentVerifications,
  createVerificationToken,
  findVerificationToken,
  readVerifiedAt,
} from "../repositories/email-verification";

/*
  Proving someone can read the address they signed up with.

  Modelled on password-reset deliberately, and for the same reasons:

    - The token is random and stored only as a hash. Whoever holds the raw
      value can verify the address; whoever reads the table cannot.
    - It expires and works once, because verification links sit in inboxes
      forever and inboxes get resold, forwarded and breached.
    - Requesting one never reveals whether an address is registered.

  A day rather than the reset flow's hour: this link is not a route to
  changing a password, and someone signing up at midnight should still be able
  to use it over breakfast.
*/
const TOKEN_TTL_MS = 24 * 60 * 60_000;
const RESEND_WINDOW_MS = 60 * 60_000;
const RESEND_MAX = 5;

const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

export const verificationRequired = () => mailConfigured();

/** Where verification links point. Same source as the reset flow's origin. */
export const verificationOrigin = () => env.APP_URL ?? "http://localhost:3000";

/**
 * Issue a verification link. Silent when it cannot or should not send.
 *
 * Returns nothing either way: a caller that behaved differently for a known
 * address would turn this into a way to enumerate who has an account.
 */
export async function sendVerification(params: {
  userId: string;
  email: string;
  origin: string;
  ip: string | null;
}): Promise<void> {
  if (!mailConfigured()) return;

  const recent = await countRecentVerifications(
    params.userId,
    new Date(Date.now() - RESEND_WINDOW_MS),
  );
  if (recent >= RESEND_MAX) return;

  const raw = randomBytes(32).toString("base64url");
  await createVerificationToken({
    userId: params.userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    requestIp: params.ip,
  });

  const link = `${params.origin}/verify?token=${encodeURIComponent(raw)}`;
  await sendEmail({
    to: params.email,
    subject: "Confirm your email for Gaari",
    html:
      `<p>Confirm this address to start posting on Gaari.</p>` +
      `<p><a href="${link}">Confirm my email</a></p>` +
      `<p>The link works once and expires in a day. If you did not sign up, ignore this.</p>`,
    text: `Confirm this address to start posting on Gaari: ${link}`,
  });
}

/** Verify an address from a raw token. Throws on anything but a live token. */
export async function completeVerification(token: string): Promise<void> {
  /*
    One message for every failure: expired, already used, never existed, or
    malformed. Distinguishing them tells someone holding a stolen token which
    guess got closer.
  */
  const invalid = new AppError("VALIDATION", "That link is no longer valid.");

  const record = await findVerificationToken(hashToken(token));
  if (!record || record.usedAt || record.expiresAt <= new Date()) throw invalid;

  // Already verified by an earlier link: nothing to do, and not an error.
  if (record.user.emailVerified) return;

  await consumeTokenAndVerify({ tokenId: record.id, userId: record.userId });
}

/** Whether this user has confirmed their address. */
export async function isVerified(userId: string): Promise<boolean> {
  return Boolean((await readVerifiedAt(userId))?.emailVerified);
}
