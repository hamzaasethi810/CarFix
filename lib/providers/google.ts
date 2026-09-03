import "server-only";

/*
  Whether Google sign-in is available, as a boolean and nothing else.

  The page needs to know if it should render the button, and lib/env is
  lint-blocked from anything client-reachable precisely because it holds the
  secret. This exposes the answer without exposing the credentials, the same
  shape as mailConfigured().
*/
export const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
