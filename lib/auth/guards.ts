import "server-only";
import { auth } from "./index";
import { AppError, forbidden, unauthenticated } from "../errors";
import { hasMfaEnabled } from "../repositories/mfa";

export type Role = "USER" | "REVIEWER" | "ADMIN";
export type AuthedUser = { id: string; role: Role; mfaEnabled: boolean };

export async function currentUser(): Promise<AuthedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    mfaEnabled: session.user.mfaEnabled,
  };
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await currentUser();
  if (!user) throw unauthenticated();
  return user;
}

/*
  Anything privileged is gated on a second factor as well as a role.

  This is a hard gate, not a nudge. A reviewer or administrator can mint links
  that reveal other people's receipts and identity documents, so a stolen
  password on one of those accounts must not be enough — and telling them to
  turn 2FA on while still letting them work would make the requirement
  meaningless.

  The check reads the database rather than the session token, so revoking a
  factor takes effect on the next request.
*/
async function requireSecondFactor(user: AuthedUser): Promise<void> {
  if (await hasMfaEnabled(user.id)) return;

  throw new AppError(
    "FORBIDDEN",
    "Set up two-factor authentication before using privileged tools. Go to Settings, Security.",
  );
}

/** Reviewers and administrators. Both can work the document queues. */
export async function requireReviewer(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== "REVIEWER" && user.role !== "ADMIN") throw forbidden();
  await requireSecondFactor(user);
  return user;
}

/** Administrators only: moderation, and anything a reviewer must not reach. */
export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw forbidden();
  await requireSecondFactor(user);
  return user;
}

/** True for anyone who should see the review tools in navigation. */
export const isPrivileged = (role: Role) => role === "REVIEWER" || role === "ADMIN";
