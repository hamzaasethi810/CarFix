import { ok, route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { getPublicProfile } from "@/lib/services/account";

type Params = { params: Promise<{ username: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const user = await currentUser();
    // Profiles are enumerable by username, so scraping is the risk here.
    await enforceRateLimit("read", clientIdentifier(req, user?.id));
    const { username } = await params;
    return ok(await getPublicProfile(username));
  });
}
