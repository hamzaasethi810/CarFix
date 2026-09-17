import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import { resetData } from "./helpers";
import { authAdapter } from "../lib/auth/adapter";
import { ensureProfile, markEmailVerified } from "../lib/repositories/user";

/*
  Google sign-in reached production and every first-time attempt died with
  "There is a problem with the server configuration". The cause: the stock
  Prisma adapter's createUser writes `name` and `image`, columns this schema
  does not have (display name lives on Profile), so prisma.user.create threw
  `Unknown argument \`name\``. Credentials sign-up never exercised the adapter,
  so nothing caught it until OAuth went live.

  These run the exact adapter path against the database, so a regression shows
  up here instead of on a stranger's first login.
*/
describe("the oauth adapter fits this schema", () => {
  beforeEach(resetData);

  it("creates a user from a Google profile without touching columns that do not exist", async () => {
    // The shape Auth.js hands createUser for a first Google sign-in.
    const created = await authAdapter.createUser!({
      id: "ignored-authjs-id",
      email: "New.Driver@example.com",
      emailVerified: null,
      name: "New Driver",
      image: "https://lh3.googleusercontent.com/a/whatever",
    });

    expect(created.id).toBeTruthy();
    expect(created.email).toBe("new.driver@example.com"); // lower-cased
    // The Google name is carried back for the createUser event, not stored.
    expect(created.name).toBe("New Driver");

    const row = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.email).toBe("new.driver@example.com");
    expect(row.passwordHash).toBeNull(); // a Google-only account has no password
  });

  it("completes the first-sign-in path: user + profile + verified email", async () => {
    // 1. adapter creates the user
    const created = await authAdapter.createUser!({
      id: "x",
      email: "grace@example.com",
      emailVerified: null,
      name: "Grace Hopper",
      image: null,
    });

    // 2. the createUser event seeds the profile and marks the address verified
    await ensureProfile(created.id, created.email!, created.name);
    await markEmailVerified(created.id);

    const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: created.id } });
    expect(profile.displayName).toBe("Grace Hopper");
    expect(profile.username).toMatch(/^[a-z0-9_]{3,}$/);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(user.emailVerified).not.toBeNull();
  });

  it("updates a user without writing name or image either", async () => {
    const created = await authAdapter.createUser!({
      id: "x",
      email: "edit@example.com",
      emailVerified: null,
      name: "Edit Me",
      image: null,
    });

    const when = new Date();
    const updated = await authAdapter.updateUser!({
      id: created.id,
      email: "edit@example.com",
      emailVerified: when,
      name: "Ignored On Update",
      image: "https://example.com/x",
    });

    expect(updated.id).toBe(created.id);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.emailVerified?.getTime()).toBe(when.getTime());
  });
});
