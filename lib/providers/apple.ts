import "server-only";
import { sign } from "node:crypto";

/*
  Sign in with Apple.

  Apple's OAuth "client secret" is not a static string like Google's — it is a
  short-lived ES256 JWT the app signs itself, with a hard ceiling of six months
  before Apple rejects it. A secret pasted into an env var therefore breaks
  silently one day, months after anyone touched it. So it is minted here at
  runtime from the four durable pieces Apple actually issues, and a fresh one is
  produced on each cold start with a 180-day expiry — the token is never the
  thing that goes stale.

  Signed with node:crypto rather than a library so no dependency is added, and
  synchronously so the auth config can stay a plain object. `dsaEncoding:
  "ieee-p1363"` is load-bearing: JWS wants the raw r‖s signature, and Node
  defaults EC signatures to DER, which Apple rejects.

  Everything is read from the environment, and a missing or malformed key
  disables the provider (see appleConfigured / lib/env's appleOAuth) rather than
  crashing boot — exactly how Google behaves when its credentials are absent.
*/

/** The Service ID, which is Apple's OAuth client_id (e.g. com.wrenchrates.web). */
const clientId = () => process.env.APPLE_CLIENT_ID;
const teamId = () => process.env.APPLE_TEAM_ID;
const keyId = () => process.env.APPLE_KEY_ID;
/*
  The .p8 private key. Env vars cannot hold real newlines, so the PEM is stored
  with the line breaks escaped as \n and restored here; a key pasted verbatim
  (already containing newlines) is left as-is.
*/
const privateKey = () => process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

/** True only when every piece Apple needs is present. */
export const appleConfigured = () =>
  Boolean(clientId() && teamId() && keyId() && privateKey());

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

/*
  Mint the client-secret JWT. Throws if the key is missing or unusable, so the
  caller can treat a half-configured Apple as "not configured" rather than
  letting a bad key take the whole auth module down.
*/
export function buildAppleClientSecret(): string {
  const [id, team, kid, key] = [clientId(), teamId(), keyId(), privateKey()];
  if (!id || !team || !kid || !key) throw new Error("Apple sign-in is not fully configured.");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid };
  const payload = {
    iss: team,
    iat: now,
    // Apple's ceiling is ~6 months; 180 days stays comfortably under it.
    exp: now + 60 * 60 * 24 * 180,
    aud: "https://appleid.apple.com",
    sub: id,
  };

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = sign("sha256", Buffer.from(signingInput), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${b64url(signature)}`;
}
