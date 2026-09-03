import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";
import { verifyPassword } from "../lib/auth/password";
import { changePassword } from "../lib/services/account";
import { changePasswordSchema } from "../lib/validation/schemas";
import { makeUser, resetData } from "./helpers";

const CURRENT = "correcthorsebattery";
const NEXT = "quietmorningcoffee";

describe("the change-password contract", () => {
  it("requires a new password long enough to be worth setting", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "short" }).success)
      .toBe(false);
  });

  it("refuses a change that changes nothing", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: CURRENT, newPassword: CURRENT }).success)
      .toBe(false);
  });

  it("is strict, so a stray confirmation field is rejected rather than ignored", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "x",
      newPassword: "aaaaaaaaaaaa",
      confirmPassword: "aaaaaaaaaaaa",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a real change", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: CURRENT, newPassword: NEXT }).success)
      .toBe(true);
  });
});

describe("changing a password", () => {
  beforeAll(async () => {
    await resetData();
  });

  it("refuses without the current password, even though the session proves who this is", async () => {
    const user = await makeUser();
    await expect(changePassword(user.id, "not-the-password", NEXT)).rejects.toThrow();

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword(CURRENT, after.passwordHash!)).toBe(true);
  });

  it("replaces the hash and signs every session out", async () => {
    const user = await makeUser();
    const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    await changePassword(user.id, CURRENT, NEXT);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword(NEXT, after.passwordHash!)).toBe(true);
    expect(await verifyPassword(CURRENT, after.passwordHash!)).toBe(false);

    /*
      The eviction is the point. With a JWT strategy there is no session row
      to delete, so bumping sessionsValidFrom is the only thing that actually
      turns out a token someone else is holding.
    */
    expect(after.sessionsValidFrom?.getTime() ?? 0).toBeGreaterThan(
      before.sessionsValidFrom?.getTime() ?? 0,
    );
  });

  it("tells a Google-only account there is no password to change", async () => {
    const user = await makeUser();
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: null } });
    await expect(changePassword(user.id, CURRENT, NEXT)).rejects.toThrow(/Google/i);
  });
});
