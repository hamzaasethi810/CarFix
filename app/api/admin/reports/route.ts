import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/guards";
import { getReports } from "@/lib/services/moderation";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

const querySchema = z
  .object({
    status: z.enum(["OPEN", "ACTIONED", "DISMISSED"]).default("OPEN"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();

export async function GET(req: Request) {
  return route(async () => {
    const admin = await requireAdmin();
    await enforceRateLimit("read", clientIdentifier(req, admin.id));
    const { status, limit, offset } = parseQuery(req, querySchema);
    return ok(await getReports(status, limit, offset));
  });
}
