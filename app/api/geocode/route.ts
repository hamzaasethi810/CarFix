import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { geocode } from "@/lib/providers/nominatim";

const querySchema = z
  .object({
    q: z.string().min(2).max(200),
    limit: z.coerce.number().int().min(1).max(8).default(5),
  })
  .strict();

/*
  Nominatim asks for at most one request per second, so this sits behind its
  own conservative budget rather than the general search allowance.
*/
export async function GET(req: Request) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("geocode", clientIdentifier(req, user?.id));
    const { q, limit } = parseQuery(req, querySchema);
    return ok(await geocode(q, limit));
  });
}
