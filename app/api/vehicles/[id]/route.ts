import { ok, parseJson, route } from "@/lib/api/handler";
import { currentUser, requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { editVehicle, getVehicle, removeVehicle } from "@/lib/services/vehicles";
import { updateVehicleSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("read", clientIdentifier(req, user?.id));
    const { id } = await params;
    return ok(await getVehicle(id, user?.id));
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    const input = await parseJson(req, updateVehicleSchema);
    return ok(await editVehicle(id, user.id, input));
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    await removeVehicle(id, user.id);
    return ok({ deleted: true });
  });
}
