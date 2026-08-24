import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { checkPrice } from "@/lib/services/price-sanity";

const querySchema = z
  .object({
    serviceId: z.string().min(1).max(64),
    generationId: z.string().max(64).optional(),
    totalPrice: z.coerce.number().min(0).max(1_000_000),
  })
  .strict();

// Advisory only: it never blocks a submission, it just asks.
export async function GET(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("read", clientIdentifier(req, user.id));
    const params = parseQuery(req, querySchema);
    return ok(await checkPrice(params));
  });
}
