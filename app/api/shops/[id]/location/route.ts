import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { updateShopDetails } from "@/lib/services/shops";
import { updateShopLocationSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    // Each save geocodes, so it shares the geocoder's conservative budget.
    await enforceRateLimit("geocode", clientIdentifier(req, user.id));
    const { id } = await params;
    const input = await parseJson(req, updateShopLocationSchema);
    // Ownership is checked in the service, against the database.
    return ok(await updateShopDetails(id, user.id, input));
  });
}
