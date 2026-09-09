import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const account = readFileSync(new URL("../lib/services/account.ts", import.meta.url), "utf8");
const form = readFileSync(new URL("../app/register/register-form.tsx", import.meta.url), "utf8");

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/*
  Registration must not become an account-existence oracle again.

  These pin the shape of the fix rather than its wording, because the wording
  is exactly what a well-meaning edit ("give a clearer error when the email is
  taken") would put back. The behaviour itself is exercised live; this is the
  cheap guard that fails in review.
*/
describe("registration does not reveal whether an email exists", () => {
  const code = stripComments(account);

  it("never turns a taken email into a distinct error", () => {
    // The tell-tale of the old behaviour: branching on the email being taken to
    // throw. Username collisions may still be reported (usernames are public),
    // so the ban is specific to the email dimension.
    expect(code).not.toMatch(/taken\.email[\s\S]{0,80}throw/);
    // Stripped source, not the raw file: the comment explaining the fix quotes
    // the old error on purpose, and must not trip its own guard.
    expect(code).not.toMatch(/account with that email already exists/i);
  });

  it("handles a taken email by notifying the owner, not the caller", () => {
    expect(code).toMatch(/taken\.email/);
    expect(code).toMatch(/sendAlreadyRegistered/);
  });

  it("still reports a taken username, which is public", () => {
    expect(code).toMatch(/taken\.username[\s\S]{0,60}throw/);
  });

  it("hashes the password on both branches, so timing cannot tell them apart", () => {
    // hashPassword sits before the taken-email branch returns.
    const hashAt = code.indexOf("hashPassword(input.password)");
    const emailBranchAt = code.indexOf("taken.email");
    expect(hashAt).toBeGreaterThan(-1);
    expect(hashAt).toBeLessThan(emailBranchAt);
  });

  it("does not auto-sign-in after registering", () => {
    // A sign-in that works for a new address and fails for an existing one is
    // the same oracle one step later, so the form must route to /login instead.
    expect(stripComments(form)).not.toMatch(/signIn\(/);
    expect(form).toMatch(/\/login\?registered=1/);
  });
});
