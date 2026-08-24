import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { suggestServices } from "@/lib/services/taxonomy";

const querySchema = z
  .object({
    q: z.string().max(80).default(""),
    limit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .strict();

export async function GET(req: Request) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("search", clientIdentifier(req, user?.id));
    const { q, limit } = parseQuery(req, querySchema);
    return ok(await suggestServices(q, limit));
  });
}
