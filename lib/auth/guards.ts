import "server-only";
import { auth } from "./index";
import { AppError, forbidden, unauthenticated } from "../errors";
import {
  isVerified,
  verificationRequired,
} from "../services/email-verification";
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
  Signed in AND email confirmed. The gate for anything that publishes.

  Reading and searching only need requireUser; writing something other people
  will see needs an address someone can actually receive mail at. That is what
  makes a throwaway account cost something, and it is the difference between
  rate-limiting a spammer and making each attempt require a real inbox.

  Skipped entirely when mail is not configured — a self-hosted instance with
  no RESEND_API_KEY would otherwise have every account permanently unable to
  post, which is a worse failure than no verification.

  The check reads the database rather than the session, so a token minted
  before verification does not carry a stale answer.
*/
export async function requireVerifiedUser(): Promise<AuthedUser> {
  const user = await requireUser();
  if (!verificationRequired()) return user;
  if (await isVerified(user.id)) return user;
  /*
    FORBIDDEN rather than a new code: the client already handles the whole
    AppErrorCode union, and adding a member means every consumer of that type
    has to learn it. The message carries the specifics.
  */
  throw new AppError(
    "FORBIDDEN",
    "Confirm your email address before posting. Check your inbox for the link.",
  );
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
