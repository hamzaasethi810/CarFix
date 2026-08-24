import "server-only";
import { hashPassword } from "../auth/password";
import { conflict, notFound } from "../errors";
import {
  createUserWithProfile,
  emailOrUsernameTaken,
  findProfileByUserId,
  findProfileByUsername,
  softDeleteUser,
  updateProfile,
} from "../repositories/user";
import { listVehiclesForUsername } from "../repositories/vehicle";
import { toPublicProfile, toVehicleSummary, type PublicProfile } from "./dto";

export async function register(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}) {
  const taken = await emailOrUsernameTaken(input.email, input.username);
  if (taken.email) throw conflict("An account with that email already exists.");
  if (taken.username) throw conflict("That username is taken.");

  const passwordHash = await hashPassword(input.password);
  const user = await createUserWithProfile({
    email: input.email,
    passwordHash,
    username: input.username,
    displayName: input.displayName,
  });

  return { id: user.id };
}

export async function getPublicProfile(username: string) {
  const profile = await findProfileByUsername(username);
  if (!profile || profile.user.deletedAt) throw notFound();

  const vehicles = await listVehiclesForUsername(username);
  return {
    profile: toPublicProfile(profile),
    vehicles: vehicles.map((v) => toVehicleSummary(v)),
  };
}

export async function getOwnProfile(userId: string): Promise<PublicProfile> {
  const profile = await findProfileByUserId(userId);
  if (!profile) throw notFound();
  return toPublicProfile(profile);
}

export async function editProfile(
  userId: string,
  data: { displayName?: string; bio?: string | null; generalLocation?: string | null },
) {
  const updated = await updateProfile(userId, data);
  return toPublicProfile(updated);
}

export async function deleteAccount(userId: string) {
  await softDeleteUser(userId);
}
