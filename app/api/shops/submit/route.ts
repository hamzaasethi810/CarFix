import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { submitShop } from "@/lib/services/shop-submissions";
import { submitShopSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    // Geocoding each submission means this shares the geocoder's budget.
    await enforceRateLimit("shopSubmit", clientIdentifier(req, user.id));
    const input = await parseJson(req, submitShopSchema);
    return ok(await submitShop(user.id, input), 201);
  });
}
