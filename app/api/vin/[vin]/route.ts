import { ok, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { lookupVin } from "@/lib/services/vin";

type Params = { params: Promise<{ vin: string }> };

// Authenticated and rate limited: the upstream service is free, and this keeps
// it from being used as an open VIN-decoding proxy.
export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("vinLookup", clientIdentifier(req, user.id));

    const { vin } = await params;
    return ok(await lookupVin(vin));
  });
}
