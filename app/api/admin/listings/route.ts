import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api/handler";
import { requireReviewer } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { getProvisionalQueue } from "@/lib/services/shop-submissions";

const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();

export async function GET(req: Request) {
  return route(async () => {
    const reviewer = await requireReviewer();
    await enforceRateLimit("read", clientIdentifier(req, reviewer.id));
    const { limit, offset } = parseQuery(req, querySchema);
    return ok(await getProvisionalQueue(limit, offset));
  });
}
