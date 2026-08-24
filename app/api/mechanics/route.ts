import { ok, parseQuery, route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { search } from "@/lib/services/mechanics";
import { mechanicSearchSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("search", clientIdentifier(req, user?.id));
    const params = parseQuery(req, mechanicSearchSchema);
    return ok(await search({ ...params, verifiedOnly: params.verifiedOnly ?? false }));
  });
}
