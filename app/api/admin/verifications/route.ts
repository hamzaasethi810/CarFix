import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/guards";
import { getVerificationQueue } from "@/lib/services/experiences";

const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();

export async function GET(req: Request) {
  return route(async () => {
    await requireAdmin();
    const { limit, offset } = parseQuery(req, querySchema);
    return ok(await getVerificationQueue(limit, offset));
  });
}
