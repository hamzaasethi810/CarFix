import "server-only";
import { AppError, conflict, notFound, validation } from "../errors";
import { decryptSecret, encryptSecret, hashBackupCode } from "../auth/crypto";
import { generateBackupCodes, generateSecret, provisioningUri, verifyCode } from "../auth/totp";
import {
  consumeBackupCode,
  countUnusedBackupCodes,
  disableTotp,
  enableTotp,
  findMfaState,
  recordTotpUse,
  stageSecret,
} from "../repositories/mfa";
import { writeAuditLog } from "../repositories/moderation";

/*
  Second-factor lifecycle.

  Enrolling is two steps on purpose: a secret is staged, and only becomes
  active once the person proves they can generate a code from it. That stops
  anyone locking themselves out of their own account with a mis-scanned QR.
*/

export async function getMfaStatus(userId: string) {
  const user = await findMfaState(userId);
  if (!user) throw notFound();

  return {
    enabled: Boolean(user.totpEnabledAt),
    // Admins handle other people's receipts and identity documents, so a
    // second factor is not optional for them.
    required: user.role === "ADMIN",
    backupCodesRemaining: user.totpEnabledAt ? await countUnusedBackupCodes(userId) : 0,
  };
}

/** Step one: stage a secret and hand back what an authenticator app needs. */
export async function beginEnrolment(userId: string) {
  const user = await findMfaState(userId);
  if (!user) throw notFound();
  if (user.totpEnabledAt) throw conflict("Two-factor authentication is already on.");

  const secret = generateSecret();
  await stageSecret(userId, encryptSecret(secret));

  const uri = provisioningUri(secret, user.email);

  /*
    The QR is rendered here, on our server, as a data URI.

    Sending the otpauth URI to a third-party QR service would hand that service
    the TOTP secret itself — which is the whole second factor. It never leaves
    this process.
  */
  const QRCode = (await import("qrcode")).default;
  const qrDataUri = await QRCode.toDataURL(uri, { margin: 1, width: 240 });

  return { secret, otpauthUri: uri, qrDataUri };
}

/** Step two: prove the app works, then turn it on and issue recovery codes. */
export async function completeEnrolment(userId: string, code: string) {
  const user = await findMfaState(userId);
  if (!user?.totpSecret) throw conflict("Start setting up two-factor authentication first.");
  if (user.totpEnabledAt) throw conflict("Two-factor authentication is already on.");

  const secret = decryptSecret(user.totpSecret);
  if (!secret) throw validation("That setup expired. Start again.");

  const step = verifyCode(secret, code, user.email);
  if (step === null) throw validation("That code was not correct. Check the time on your phone.");

  const codes = generateBackupCodes();
  await enableTotp(userId, codes.map(hashBackupCode));
  await recordTotpUse(userId, new Date(step * 30_000));

  await writeAuditLog({
    actorId: userId,
    action: "mfa.enabled",
    targetType: "User",
    targetId: userId,
  });

  // Shown exactly once — they are hashed the moment they are stored.
  return { backupCodes: codes };
}

/**
 * Checks a factor at login. Accepts either a TOTP code or an unused backup
 * code, and rejects a TOTP code that has already been used.
 */
export async function verifySecondFactor(userId: string, submitted: string): Promise<boolean> {
  const user = await findMfaState(userId);
  if (!user?.totpEnabledAt || !user.totpSecret) return false;

  const cleaned = submitted.trim();

  // A backup code carries a dash and is longer than a TOTP code.
  if (cleaned.includes("-") || cleaned.replace(/\s/g, "").length > 6) {
    const consumed = await consumeBackupCode(user.id, hashBackupCode(cleaned));
    if (consumed) {
      await writeAuditLog({
        actorId: user.id,
        action: "mfa.backup_code_used",
        targetType: "User",
        targetId: user.id,
      });
    }
    return consumed;
  }

  const secret = decryptSecret(user.totpSecret);
  if (!secret) return false;

  const step = verifyCode(secret, cleaned, user.email);
  if (step === null) return false;

  /*
    Replay guard. A TOTP code stays valid for its whole window, so without
    this an intercepted code could be used a second time within 30 seconds.
  */
  const usedAt = new Date(step * 30_000);
  if (user.totpLastUsedAt && usedAt <= user.totpLastUsedAt) return false;

  await recordTotpUse(user.id, usedAt);
  return true;
}

/** Turning it off requires proving possession, so a stolen session cannot. */
export async function disable(userId: string, code: string) {
  const user = await findMfaState(userId);
  if (!user?.totpEnabledAt) throw conflict("Two-factor authentication is not on.");
  if (user.role === "ADMIN")
    throw new AppError(
      "FORBIDDEN",
      "Administrator accounts must keep two-factor authentication on.",
    );

  const ok = await verifySecondFactor(userId, code);
  if (!ok) throw validation("That code was not correct.");

  await disableTotp(userId);
  await writeAuditLog({
    actorId: userId,
    action: "mfa.disabled",
    targetType: "User",
    targetId: userId,
  });
}
