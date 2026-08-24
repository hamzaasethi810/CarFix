import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { env } from "../env";

/*
  Encryption for TOTP secrets.

  A TOTP secret is a bearer credential: anyone holding it can generate valid
  codes forever. Storing it in plaintext would mean a database dump alone
  defeats the second factor entirely, so it is encrypted with AES-256-GCM under
  a key that lives in the environment, not the database. An attacker needs both
  to get anywhere.

  GCM is authenticated, so tampering with a stored ciphertext fails loudly
  rather than decrypting to something attacker-chosen.
*/

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

/** Derives a 32-byte key from AUTH_SECRET so there is no second secret to manage. */
function key(): Buffer {
  return createHash("sha256").update(`totp:${env.AUTH_SECRET}`).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv.tag.ciphertext, all base64url so it is safe in any column.
  return [iv, tag, encrypted].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(stored: string): string | null {
  try {
    const [ivPart, tagPart, dataPart] = stored.split(".");
    if (!ivPart || !tagPart || !dataPart) return null;

    const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key or tampered ciphertext. Never throw the reason back to a caller.
    return null;
  }
}

/*
  Backup codes are hashed, not encrypted: we only ever need to check one, never
  to read it back. SHA-256 is appropriate here because the code is 80 bits of
  randomness we generated — unlike a human password, it is not guessable, so
  the slow-hash reasoning does not apply.
*/
export const hashBackupCode = (code: string) =>
  createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");

/** Constant-time comparison so a timing signal cannot reveal a partial match. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
