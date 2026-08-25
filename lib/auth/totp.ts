import "server-only";
import { randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";

/*
  Time-based one-time passwords, the standard behind Google Authenticator,
  Authy, 1Password, and every other authenticator app.

  Defaults are the interoperable ones: SHA-1, 6 digits, 30-second period. They
  look weak written down, but changing them breaks compatibility with most
  authenticator apps for no real gain — the security comes from the secret's
  entropy and the short validity window, both of which are set here.
*/

/*
  What an authenticator app shows beside the account. Only read when a secret is
  first enrolled, so entries already in someone's app keep the old name until
  they enrol again — the codes themselves depend on the secret and the clock,
  not on this.
*/
const ISSUER = "Gaari";
const DIGITS = 6;
const PERIOD = 30;

/**
 * Allows the immediately previous and next step, absorbing clock drift between
 * the phone and the server. One step either side is the usual compromise:
 * wider windows meaningfully extend how long a stolen code stays usable.
 */
const WINDOW = 1;

export function generateSecret(): string {
  // 160 bits, the RFC 4226 recommendation.
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function totp(secret: string, label: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/** The otpauth:// URI an authenticator app scans. */
export const provisioningUri = (secret: string, accountLabel: string) =>
  totp(secret, accountLabel).toString();

/**
 * Validates a code. Returns the matched time step, which the caller stores so
 * the same code cannot be replayed within its validity window.
 */
export function verifyCode(secret: string, code: string, accountLabel: string): number | null {
  const cleaned = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return null;

  const delta = totp(secret, accountLabel).validate({ token: cleaned, window: WINDOW });
  if (delta === null) return null;

  // Absolute step number, so it is comparable across requests.
  return Math.floor(Date.now() / 1000 / PERIOD) + delta;
}

/** Ten single-use recovery codes, formatted in groups for legibility. */
export function generateBackupCodes(count = 10): string[] {
  /*
    Excludes I, O, 0, and 1, which people transcribe wrongly. Exactly 32
    characters so 256 % 32 === 0 and mapping a random byte through it stays
    unbiased — a shorter alphabet would skew which codes are generated.
  */
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: count }, () => {
    const raw = randomBytes(10);
    const chars = Array.from(raw, (b) => alphabet[b % alphabet.length]).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5, 10)}`;
  });
}
