import { ok, route } from "@/lib/api/handler";
import { requireReviewer } from "@/lib/auth/guards";
import { getReceiptViewUrl } from "@/lib/services/experiences";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const reviewer = await requireReviewer();
    await enforceRateLimit("mutation", clientIdentifier(req, reviewer.id));
    const { id } = await params;
    return ok(await getReceiptViewUrl(id, reviewer.id));
  });
}
