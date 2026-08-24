import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { addVehicle, getGarage } from "@/lib/services/vehicles";
import { createVehicleSchema } from "@/lib/validation/schemas";

export async function GET() {
  return route(async () => {
    const user = await requireUser();
    return ok(await getGarage(user.id));
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    const input = await parseJson(req, createVehicleSchema);
    return ok(await addVehicle(user.id, input), 201);
  });
}
