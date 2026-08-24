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

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // A TOTP code or a backup code, required only when the account has MFA on.
  totp: z.string().max(20).optional(),
});
