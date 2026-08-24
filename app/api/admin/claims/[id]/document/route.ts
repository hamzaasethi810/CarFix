import { ok, route } from "@/lib/api/handler";
import { requireReviewer } from "@/lib/auth/guards";
import { getClaimDocumentUrl } from "@/lib/services/shops";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const reviewer = await requireReviewer();
    await enforceRateLimit("mutation", clientIdentifier(req, reviewer.id));
    const { id } = await params;
    return ok(await getClaimDocumentUrl(id, reviewer.id));
  });
}
