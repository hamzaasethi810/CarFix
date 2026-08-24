import "server-only";
import { prisma } from "../db";
import type { Role } from "../generated/prisma/enums";

export const findUserByEmail = (email: string) =>
  prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
    select: { id: true, email: true, passwordHash: true, role: true },
  });

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

export const updateProfile = (
  userId: string,
  data: { displayName?: string; bio?: string | null; generalLocation?: string | null; photoKey?: string },
) =>
  prisma.profile.update({
    where: { userId },
    data,
    select: {
      username: true,
      displayName: true,
      bio: true,
      photoKey: true,
      generalLocation: true,
    },
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
