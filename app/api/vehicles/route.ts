import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { addVehicle, getGarage } from "@/lib/services/vehicles";
import { createVehicleSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("read", clientIdentifier(req, user.id));
    return ok(await getGarage(user.id));
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const input = await parseJson(req, createVehicleSchema);
    return ok(await addVehicle(user.id, input), 201);
  });
}
