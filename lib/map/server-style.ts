import "server-only";
import { env } from "../env";
import { mapStyleUrl } from "./style";

/*
  Resolves the map's tile style on the server.

  This exists so `app/page.tsx` does not import `lib/env` directly. That import
  is banned across `app/**` by an eslint rule, and the rule is right: server env
  holds real secrets, and a client component pulling it in would bundle them.
  A blanket disable on the page would switch that guard off for every other
  secret too.

  The MapTiler key is the one value in there that is *meant* to reach the
  browser — tiles are fetched by the client, so it has no choice — and
  `server-only` guarantees this module can never be pulled into a client
  bundle by accident, so the rest of `env` stays where it belongs. The page
  calls this, gets back a finished URL, and passes that down as a prop.

  Why not just use a NEXT_PUBLIC_ variable: Vercel refuses that prefix on a
  variable marked Sensitive, so requiring it would mean choosing between the
  dashboard's protection and the map working at all. What actually protects
  this key is the domain allowlist in the MapTiler dashboard, not secrecy.
*/
export function serverMapStyleUrl(): string {
  return mapStyleUrl(env.MAPTILER_KEY);
}
