/*
  Pins the connection to a verified TLS mode.

  node-postgres currently treats `require`, `prefer` and `verify-ca` as
  aliases for `verify-full`, and warns that its next major version will adopt
  libpq semantics instead — under which those modes do NOT verify the server's
  certificate. So a routine dependency bump would quietly downgrade every
  connection from verified to unverified, with nothing failing and nothing to
  notice.

  Saying `verify-full` explicitly means the behaviour is stated rather than
  inherited, and the upgrade changes nothing.

  Done here rather than in a .env file because production's URL comes from
  Neon's integration, where nobody in this repository chose the mode at all.
*/

const WEAKENED = new Set(["require", "prefer", "verify-ca"]);

export function withStrictSsl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not ours to diagnose — let the driver fail with its own message.
    return url;
  }

  const mode = parsed.searchParams.get("sslmode");
  // No mode at all means the driver's default applies, and `disable` is a
  // deliberate choice. Neither is ours to override.
  if (!mode || !WEAKENED.has(mode)) return url;

  parsed.searchParams.set("sslmode", "verify-full");
  return parsed.toString();
}
