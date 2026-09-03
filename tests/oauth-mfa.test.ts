import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/*
  The Google handshake cannot be exercised in a unit test, so this asserts the
  wiring instead. Three mistakes would open real holes, and each is cheap to
  detect: a missing role check on the OAuth path, an account that arrives
  without a profile, and a session that outlives its window.
*/
const auth = readFileSync("lib/auth/index.ts", "utf8");
const users = readFileSync("lib/repositories/user.ts", "utf8");

describe("google sign-in cannot bypass MFA", () => {
  it("checks the role and TOTP state on the google path", () => {
    expect(auth).toMatch(/provider !== "google"/);
    expect(auth).toMatch(/totpEnabledAt/);
    expect(auth).toMatch(/MFA_REQUIRED/);
  });

  it("refuses a deleted account rather than resurrecting it", () => {
    expect(auth).toMatch(/deletedAt/);
  });

  it("does not silently link a google login onto an existing password account", () => {
    expect(auth).toMatch(/allowDangerousEmailAccountLinking:\s*false/);
  });
});

describe("an oauth account is fully built", () => {
  it("gets a profile, because the rest of the app assumes one", () => {
    expect(auth).toMatch(/ensureProfile/);
    expect(users).toMatch(/export async function ensureProfile/);
  });

  it("is treated as email-verified, since google proved the address", () => {
    expect(auth).toMatch(/markEmailVerified/);
  });
});

describe("session lifetime", () => {
  it("expires after twenty minutes", () => {
    expect(auth).toMatch(/maxAge:\s*60\s*\*\s*20\b/);
  });

  it("keeps the jwt strategy, so sessionsValidFrom stays the revocation path", () => {
    expect(auth).toMatch(/strategy:\s*"jwt"/);
  });
});

describe("a password-less account cannot sign in with a password", () => {
  it("fails closed on a null hash", () => {
    expect(auth).toMatch(/if \(!user\.passwordHash\) return null;/);
  });
});
