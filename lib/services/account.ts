import "server-only";
import { hashPassword, verifyPassword } from "../auth/password";
import { conflict, notFound, validation } from "../errors";
import { sendAlreadyRegistered, sendVerification, verificationOrigin } from "./email-verification";
import {
  createUserWithProfile,
  emailOrUsernameTaken,
  findCredentialsById,
  setPassword,
  findProfileByUserId,
  findProfileByUsername,
  softDeleteUser,
  updateProfile,
  updateUsername,
  usernameTakenByOther,
} from "../repositories/user";
import { listVehiclesForUsername } from "../repositories/vehicle";
import { toPublicProfile, toVehicleSummary, type PublicProfile } from "./dto";

/*
  Registration is deliberately not an account-existence oracle.

  Every other unauthenticated flow here — sign-in, password reset — is careful
  never to reveal whether an address has an account. Registration used to give
  it away outright: "An account with that email already exists." was a distinct
  error, so the form was a way to test any address. This closes that, and the
  cost is that a brand-new account is no longer signed in automatically — the
  caller is sent to sign in — because a sign-in that succeeds for a new address
  and fails for an existing one would be the same oracle one step later.

  Two dimensions, treated differently on purpose:

    - Username is public. It shows as @handle on every profile and beside every
      report, so a collision is not a secret and the person must pick another
      to continue. It is reported plainly.
    - Email is private. Whether an address is registered is exactly what must
      not leak, so both outcomes return the identical shape below, cost the
      same (the password is hashed either way, so bcrypt's ~quarter-second does
      not become a timing tell), and differ only in which email is sent — and
      that difference reaches the address's real owner, never the form.
*/
export async function register(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
  /** Recorded against the verification token, to make abuse investigable. */
  ip?: string | null;
}): Promise<{ ok: true }> {
  const taken = await emailOrUsernameTaken(input.email, input.username);
  if (taken.username) throw conflict("That username is taken.");

  // Hashed on both branches, before they diverge, so the taken-email path is
  // not measurably faster than a real sign-up. This mirrors the equalizing
  // hash the sign-in path does for an address that has no account.
  const passwordHash = await hashPassword(input.password);
  const origin = verificationOrigin();

  if (taken.email) {
    // No account is created, and the form is told nothing. Only the inbox that
    // owns the address hears that someone tried.
    void sendAlreadyRegistered({ email: input.email, origin }).catch(() => {});
    return { ok: true };
  }

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
    origin,
    ip: input.ip ?? null,
  }).catch(() => {});

  return { ok: true };
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

/*
  Changing the @handle.

  Unique across everyone, so it can fail as "taken". The check runs first for a
  clean message, and the unique index behind it is the real guarantee: two
  people racing for the same free handle both pass the check, and the second
  write hits the constraint (P2002), which is caught and reported the same way
  rather than surfacing as a 500. Re-saving your own current handle is a no-op,
  not a conflict, because the check excludes this account.
*/
export async function changeUsername(userId: string, username: string) {
  if (await usernameTakenByOther(username, userId)) throw conflict("That username is taken.");

  try {
    const updated = await updateUsername(userId, username);
    return toPublicProfile(updated);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw conflict("That username is taken.");
    }
    throw error;
  }
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
