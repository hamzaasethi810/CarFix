import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { requestReset, resetLinkOrigin } from "@/lib/services/password-reset";

const bodySchema = z.object({ email: z.string().email().max(254) }).strict();

/*
  Unauthenticated by necessity — somebody who cannot sign in is the whole point.
  Rate limited on the source address AND the address being asked for, so it is
  neither a way to spray reset mail nor a way to bombard one inbox.
*/
export async function POST(req: Request) {
  return route(async () => {
    const { email } = await parseJson(req, bodySchema);
    const ip = clientIdentifier(req);
    await enforceRateLimit("passwordReset", `${ip}:${email.toLowerCase()}`);
    return ok(await requestReset(email, resetLinkOrigin(), ip));
  });
}
