import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import { makeUser, resetData } from "./helpers";
import { changeUsername } from "../lib/services/account";
import { changeUsernameSchema } from "../lib/validation/schemas";

/*
  Changing the @handle. It is public, unique, and points at a person, so the
  rules that matter — the character set, moderation, and "someone else already
  has this" — are the ones tested. Rate limiting is enforced at the route on
  the shared limiter (tests/rate-limit-ip.test.ts covers that machinery); here
  the service and its schema are what is exercised.
*/
describe("the username change schema", () => {
  it("accepts a clean lowercase handle", () => {
    expect(changeUsernameSchema.safeParse({ username: "grease_monkey" }).success).toBe(true);
  });

  it("rejects capitals, spaces and punctuation", () => {
    for (const username of ["GreaseMonkey", "grease monkey", "grease.monkey", "grease-monkey"]) {
      expect(changeUsernameSchema.safeParse({ username }).success, username).toBe(false);
    }
  });

  it("rejects handles shorter than three characters", () => {
    expect(changeUsernameSchema.safeParse({ username: "ab" }).success).toBe(false);
  });

  it("screens the handle for slurs, same as registration", () => {
    expect(changeUsernameSchema.safeParse({ username: "faggot123" }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(
      changeUsernameSchema.safeParse({ username: "valid_handle", role: "ADMIN" }).success,
    ).toBe(false);
  });
});

describe("changeUsername", () => {
  beforeEach(resetData);

  it("changes the caller's own handle and returns the new profile", async () => {
    const user = await makeUser();
    const result = await changeUsername(user.id, "new_handle_here");
    expect(result.username).toBe("new_handle_here");

    const row = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(row.username).toBe("new_handle_here");
  });

  it("lets you re-save your own current handle without a conflict", async () => {
    const user = await makeUser();
    await expect(changeUsername(user.id, user.username)).resolves.toMatchObject({
      username: user.username,
    });
  });

  it("refuses a handle another account already holds", async () => {
    const alice = await makeUser();
    const bob = await makeUser();

    await expect(changeUsername(bob.id, alice.username)).rejects.toMatchObject({
      code: "CONFLICT",
    });

    // Bob's handle is unchanged.
    const row = await prisma.profile.findUniqueOrThrow({ where: { userId: bob.id } });
    expect(row.username).toBe(bob.username);
  });
});
