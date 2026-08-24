import { z } from "zod";
import { ok, parseJson, parseQuery, route } from "@/lib/api/handler";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { completeReset, inspectToken } from "@/lib/services/password-reset";

const inspectSchema = z.object({ token: z.string().min(10).max(200) }).strict();

const resetSchema = z
  .object({
    token: z.string().min(10).max(200),
    // Only a size guard here — the real rule, and the message that explains
    // it, belong to the service.
    password: z.string().min(1).max(200),
    totp: z.string().max(20).optional(),
  })
  .strict();

/** Tells the page whether the link is worth showing a form for. */
export async function GET(req: Request) {
  return route(async () => {
    await enforceRateLimit("passwordReset", clientIdentifier(req));
    const { token } = parseQuery(req, inspectSchema);
    return ok(await inspectToken(token));
  });
}

export async function POST(req: Request) {
  return route(async () => {
    await enforceRateLimit("passwordReset", clientIdentifier(req));
    const input = await parseJson(req, resetSchema);
    return ok(await completeReset(input));
  });
}
