import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { editVehicle, getVehicle, removeVehicle } from "@/lib/services/vehicles";
import { updateVehicleSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return route(async () => {
    const { id } = await params;
    return ok(await getVehicle(id));
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJson(req, updateVehicleSchema);
    return ok(await editVehicle(id, user.id, input));
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await params;
    await removeVehicle(id, user.id);
    return ok({ deleted: true });
  });
}
