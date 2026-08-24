import { ok, route } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/guards";
import { getReceiptViewUrl } from "@/lib/services/experiences";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const admin = await requireAdmin();
    await enforceRateLimit("mutation", clientIdentifier(req, admin.id));
    const { id } = await params;
    return ok(await getReceiptViewUrl(id, admin.id));
  });
}
