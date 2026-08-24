import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { createPortalSession } from "@/lib/services/billing";

const bodySchema = z.object({ mechanicId: z.string().min(1).max(64) }).strict();

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("billing", clientIdentifier(req, user.id));
    const { mechanicId } = await parseJson(req, bodySchema);
    return ok(await createPortalSession(mechanicId, user.id));
  });
}
