import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireReviewer } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { decideListing } from "@/lib/services/shop-submissions";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ decision: z.enum(["CONFIRMED", "REJECTED"]) }).strict();

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const reviewer = await requireReviewer();
    await enforceRateLimit("mutation", clientIdentifier(req, reviewer.id));
    const { id } = await params;
    const { decision } = await parseJson(req, bodySchema);
    return ok(
      await decideListing({ mechanicId: id, actorId: reviewer.id, confirm: decision === "CONFIRMED" }),
    );
  });
}
