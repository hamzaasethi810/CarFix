import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, hashBackupCode, safeEqual } from "../lib/auth/crypto";
import { generateBackupCodes, generateSecret, provisioningUri, verifyCode } from "../lib/auth/totp";
import * as OTPAuth from "otpauth";

/** Produces the code an authenticator app would show right now. */
function currentCode(secret: string, label: string, offsetSteps = 0) {
  const totp = new OTPAuth.TOTP({
    issuer: "CarFix",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.generate({ timestamp: Date.now() + offsetSteps * 30_000 });
}

describe("secret encryption", () => {
  it("round-trips a secret", () => {
    const secret = generateSecret();
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("never stores the secret in readable form", () => {
    const secret = generateSecret();
    expect(encryptSecret(secret)).not.toContain(secret);
  });

  it("produces a different ciphertext each time", () => {
    // A fixed IV would let identical secrets be recognised in a dump.
    const secret = generateSecret();
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  it("refuses a tampered ciphertext rather than returning garbage", () => {
    const stored = encryptSecret(generateSecret());
    const [iv, tag, data] = stored.split(".");
    const flipped = data.slice(0, -2) + (data.slice(-2) === "AA" ? "AB" : "AA");
    expect(decryptSecret(`${iv}.${tag}.${flipped}`)).toBeNull();
  });

  it("returns null on malformed input instead of throwing", () => {
    expect(decryptSecret("not-a-ciphertext")).toBeNull();
    expect(decryptSecret("")).toBeNull();
  });
});

describe("TOTP verification", () => {
  const label = "someone@example.com";

  it("accepts the code an authenticator would currently show", () => {
    const secret = generateSecret();
    expect(verifyCode(secret, currentCode(secret, label), label)).not.toBeNull();
  });

  it("accepts one step either side, for clock drift", () => {
    const secret = generateSecret();
    expect(verifyCode(secret, currentCode(secret, label, -1), label)).not.toBeNull();
    expect(verifyCode(secret, currentCode(secret, label, 1), label)).not.toBeNull();
  });

  it("rejects a code from well outside the window", () => {
    const secret = generateSecret();
    expect(verifyCode(secret, currentCode(secret, label, 10), label)).toBeNull();
  });

  it("rejects a code generated from a different secret", () => {
    const mine = generateSecret();
    const theirs = generateSecret();
    expect(verifyCode(mine, currentCode(theirs, label), label)).toBeNull();
  });

  it.each(["", "12345", "1234567", "abcdef", "12 34 56x"])(
    "rejects malformed input %s",
    (input) => {
      expect(verifyCode(generateSecret(), input, label)).toBeNull();
    },
  );

  it("returns a step number that increases over time, enabling replay checks", () => {
    const secret = generateSecret();
    const now = verifyCode(secret, currentCode(secret, label), label);
    const later = verifyCode(secret, currentCode(secret, label, 1), label);
    expect(now).not.toBeNull();
    expect(later).not.toBeNull();
    expect(later!).toBeGreaterThan(now!);
  });

  it("builds a provisioning URI an authenticator app understands", () => {
    const secret = generateSecret();
    const uri = provisioningUri(secret, label);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("issuer=CarFix");
    expect(uri).toContain(secret);
  });
});

describe("backup codes", () => {
  it("issues ten distinct codes", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it("avoids characters that are easy to misread", () => {
    for (const code of generateBackupCodes(50)) {
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it("draws from a 32-character alphabet so the sampling is unbiased", () => {
    // 256 % 32 === 0, so mapping a random byte through it favours nothing.
    const seen = new Set(generateBackupCodes(400).join("").replace(/-/g, ""));
    expect(seen.size).toBe(32);
  });

  it("hashes consistently regardless of spacing or case", () => {
    const code = generateBackupCodes(1)[0];
    expect(hashBackupCode(code.toLowerCase())).toBe(hashBackupCode(code));
    expect(hashBackupCode(code.replace("-", " "))).toBe(hashBackupCode(code));
  });

  it("does not store the code itself", () => {
    const code = generateBackupCodes(1)[0];
    expect(hashBackupCode(code)).not.toContain(code.replace("-", ""));
  });
});

describe("constant-time comparison", () => {
  it("matches equal strings and rejects different ones", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
    expect(safeEqual("abc123", "abc124")).toBe(false);
  });

  it("handles different lengths without throwing", () => {
    expect(safeEqual("short", "muchlonger")).toBe(false);
  });
});

describe("the sign-in form's credential fields", () => {
  it("declares every field authorize actually reads", async () => {
    const { credentialFields, credentialsSchema } = await import("../lib/auth/credentials");

    /*
      Auth.js strips any credential the provider did not declare, without
      complaint. An undeclared field therefore reaches authorize() as
      undefined — and when that field is `totp`, every account with a second
      factor is locked out of the site with a "wrong password" message. This
      keeps the declaration and the schema from drifting apart.
    */
    for (const field of Object.keys(credentialsSchema.shape)) {
      expect(Object.keys(credentialFields)).toContain(field);
    }
  });
});
