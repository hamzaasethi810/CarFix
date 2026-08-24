import { ok, route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { getMechanic } from "@/lib/services/mechanics";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("read", clientIdentifier(req, user?.id));
    const { id } = await params;
    return ok(await getMechanic(id));
  });
}
