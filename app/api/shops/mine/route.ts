import { ok, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { getMyShops } from "@/lib/services/shops";

export async function GET(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("read", clientIdentifier(req, user.id));
    return ok(await getMyShops(user.id));
  });
}
