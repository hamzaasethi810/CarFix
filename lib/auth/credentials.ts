import { z } from "zod";

/*
  What the sign-in form is allowed to send.

  These two must stay in step. Auth.js discards any credential the provider did
  not declare in `credentialFields`, silently and with no error, so a field the
  schema reads but the declaration omits arrives at authorize() as undefined.
  When that field is the second factor, the effect is that no account with MFA
  can sign in at all — and the message it produces says the password was wrong,
  which sends anyone debugging it in the wrong direction entirely.

  Kept in its own module, free of any NextAuth import, so the invariant can be
  tested without pulling the whole auth runtime into the test environment.
*/

export const credentialFields = { email: {}, password: {}, totp: {} };

/*
  The reasons a sign-in can fail, as the browser sees them.

  Auth.js forwards only an error's `code`, so these strings are the entire
  channel between the server and the form. They live here, shared by both
  sides, because when they were written out by hand in two files a mismatch
  was invisible: the form simply fell through to "wrong password" and the real
  reason — enrol a second factor, or wait five minutes — was never shown.
*/
export const SIGNIN_ERROR = {
  /** Password was right; this account needs its second factor. */
  mfaRequired: "MFA_REQUIRED",
  /** Second factor was supplied and was wrong. */
  mfaInvalid: "MFA_INVALID",
  /** Too many attempts. Nothing is wrong with the credentials. */
  rateLimited: "RATE_LIMITED",
} as const;

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // A TOTP code or a backup code, required only when the account has MFA on.
  totp: z.string().max(20).optional(),
});
