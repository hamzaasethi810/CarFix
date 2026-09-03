import "server-only";
import { hashPassword, verifyPassword } from "../auth/password";
import { conflict, notFound, validation } from "../errors";
import { sendVerification, verificationOrigin } from "./email-verification";
import {
  createUserWithProfile,
  emailOrUsernameTaken,
  findCredentialsById,
  setPassword,
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
  /** Recorded against the verification token, to make abuse investigable. */
  ip?: string | null;
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

  /*
    The verification link goes out here rather than from the route, so every
    caller that creates an account gets it — a second sign-up path added later
    cannot forget to send one.

    Deliberately not awaited into the response's success: a mail provider
    having a bad minute must not fail a registration that already wrote a user
    row. The account exists; the link can be re-requested.
  */
  void sendVerification({
    userId: user.id,
    email: input.email,
    origin: verificationOrigin(),
    ip: input.ip ?? null,
  }).catch(() => {});

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

/**
 * Changes a password from inside the account, and signs out everywhere.
 *
 * The current password is checked even though the session already proves who
 * this is. A session is a device someone left unlocked; re-asking is what
 * stops a borrowed laptop turning into a permanent takeover.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await findCredentialsById(userId);
  if (!user) throw notFound();

  /*
    A Google-only account has no password to replace. Told plainly rather
    than failed generically: this is someone already signed in asking about
    their own account, so there is nothing to leak by being clear.
  */
  if (!user.passwordHash) {
    throw validation(
      "This account signs in with Google, so there is no password to change.",
    );
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw validation("That is not your current password.");

  await setPassword(userId, await hashPassword(newPassword));
}
