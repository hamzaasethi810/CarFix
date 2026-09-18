import "server-only";
import { prisma } from "../db";
import type { Role } from "../generated/prisma/enums";

export const findUserByEmail = (email: string) =>
  prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
    select: { id: true, email: true, passwordHash: true, role: true },
  });

/** When the account was created — used to greet a brand-new Google sign-in. */
export const findUserJoinTime = (id: string) =>
  prisma.user.findUnique({ where: { id }, select: { createdAt: true } });

export const findActiveUserById = (id: string) =>
  prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
      sessionsValidFrom: true,
      totpEnabledAt: true,
    },
  });

export const createUserWithProfile = (data: {
  email: string;
  passwordHash: string;
  username: string;
  displayName: string;
}) =>
  prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      profile: { create: { username: data.username, displayName: data.displayName } },
    },
    select: { id: true, email: true, role: true },
  });

export const emailOrUsernameTaken = async (email: string, username: string) => {
  const [byEmail, byUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } }),
    prisma.profile.findUnique({ where: { username }, select: { id: true } }),
  ]);
  return { email: Boolean(byEmail), username: Boolean(byUsername) };
};

export const findProfileByUsername = (username: string) =>
  prisma.profile.findUnique({
    where: { username },
    select: {
      username: true,
      displayName: true,
      bio: true,
      photoKey: true,
      generalLocation: true,
      user: { select: { id: true, createdAt: true, deletedAt: true } },
    },
  });

export const findProfileByUserId = (userId: string) =>
  prisma.profile.findUnique({
    where: { userId },
    select: {
      username: true,
      displayName: true,
      bio: true,
      photoKey: true,
      generalLocation: true,
    },
  });

const profileView = {
  username: true,
  displayName: true,
  bio: true,
  photoKey: true,
  generalLocation: true,
} as const;

export const updateProfile = (
  userId: string,
  data: { displayName?: string; bio?: string | null; generalLocation?: string | null; photoKey?: string },
) =>
  prisma.profile.update({
    where: { userId },
    data,
    select: profileView,
  });

/** True when the handle belongs to someone other than this account. */
export const usernameTakenByOther = async (username: string, exceptUserId: string) =>
  Boolean(
    await prisma.profile.findFirst({
      where: { username, NOT: { userId: exceptUserId } },
      select: { id: true },
    }),
  );

export const updateUsername = (userId: string, username: string) =>
  prisma.profile.update({
    where: { userId },
    data: { username },
    select: profileView,
  });

/*
  Changing a role signs the account out everywhere. A promotion must arrive as
  a fresh login, both so the new rights are never quietly attached to a tab
  that was already open, and so a privileged account is forced through
  enrolment before it can do anything.
*/
export const setUserRole = (userId: string, role: Role) =>
  prisma.user.update({
    where: { id: userId },
    data: { role, sessionsValidFrom: new Date() },
    select: { id: true, role: true },
  });

export const softDeleteUser = (userId: string) =>
  prisma.$transaction(async (tx) => {
    const stamp = new Date();
    await tx.vehicle.updateMany({ where: { ownerId: userId }, data: { deletedAt: stamp } });
    await tx.mechanicExperience.updateMany({ where: { userId }, data: { deletedAt: stamp } });
    await tx.session.deleteMany({ where: { userId } });
    return tx.user.update({
      where: { id: userId },
      data: { deletedAt: stamp },
      select: { id: true },
    });
  });

/*
  Gives a Google-created account the profile the rest of the app assumes.

  The adapter creates a User row and nothing else, but Profile.username is
  unique and required wherever a profile exists, so a public profile page or
  anything reading profile.username would break for an OAuth account.

  The username is derived from the email's local part and suffixed until it is
  free. The loop is bounded: after a handful of collisions it falls back to a
  random tail rather than scanning forever.
*/
export async function ensureProfile(userId: string, email: string, displayName?: string | null) {
  const existing = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
  if (existing) return;

  const base =
    (email.split("@")[0] ?? "driver")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "driver";
  // The schema floor is 3 characters.
  const seed = base.length >= 3 ? base : `${base}car`;

  let username = seed;
  for (let i = 0; i < 6; i++) {
    const taken = await prisma.profile.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!taken) break;
    username = `${seed.slice(0, 24)}${i + 2}`;
  }
  const stillTaken = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });
  if (stillTaken) username = `${seed.slice(0, 20)}${Math.random().toString(36).slice(2, 7)}`;

  await prisma.profile.create({
    data: {
      userId,
      username,
      displayName: (displayName?.trim() || seed).slice(0, 60),
    },
  });
}

/*
  A Google account has proven its address, so it should not then be held
  behind email verification. updateMany rather than update: it is a no-op if
  the row is already verified or already gone.
*/
export const markEmailVerified = (userId: string) =>
  prisma.user.updateMany({
    where: { id: userId, emailVerified: null },
    data: { emailVerified: new Date() },
  });

/*
  Reads the hash for a password change. Separate from findUserByEmail because
  this one is keyed on the session's user id, not on an address a caller
  supplied.
*/
export const findCredentialsById = (id: string) =>
  prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, passwordHash: true },
  });

/*
  Sets a new hash and signs every existing session out.

  Bumping sessionsValidFrom is the point, not a side effect: with a JWT
  strategy there is no session row to delete, so this is the only thing that
  actually evicts a token someone else is holding. Changing a password
  because you think it was seen is worthless if the other device stays in.
*/
export const setPassword = (id: string, passwordHash: string) =>
  prisma.user.update({
    where: { id },
    data: { passwordHash, sessionsValidFrom: new Date() },
  });
