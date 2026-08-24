import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { suggest } from "@/lib/services/mechanics";

const querySchema = z
  .object({
    q: z.string().min(1).max(80),
    limit: z.coerce.number().int().min(1).max(15).default(8),
  })
  .strict();

// Typeahead fires per keystroke, so it shares the search budget.
export async function GET(req: Request) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("search", clientIdentifier(req, user?.id));
    const { q, limit } = parseQuery(req, querySchema);
    return ok(await suggest(q, limit));
  });
}
