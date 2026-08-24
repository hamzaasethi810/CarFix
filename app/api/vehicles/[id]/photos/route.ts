import { ok, parseForm, requireFile, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { removeVehiclePhoto, setVehiclePhoto } from "@/lib/services/vehicles";
import { photoSlotSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("photoUpload", clientIdentifier(req, user.id));

    const { id } = await params;
    const form = await parseForm(req);
    const slot = photoSlotSchema.parse(form.get("slot"));
    const file = requireFile(form, "file");

    return ok(await setVehiclePhoto(id, user.id, slot, file));
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await params;
    const slot = photoSlotSchema.parse(new URL(req.url).searchParams.get("slot"));
    await removeVehiclePhoto(id, user.id, slot);
    return ok({ deleted: true });
  });
}
