import { ok, parseJson, route } from "@/lib/api/handler";
import { currentUser, requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { editExperience, getExperience, removeExperience } from "@/lib/services/experiences";
import { updateExperienceSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("read", clientIdentifier(req, user?.id));
    const { id } = await params;
    return ok(await getExperience(id, user?.id));
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    const input = await parseJson(req, updateExperienceSchema);
    return ok(await editExperience(id, user.id, input));
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    await removeExperience(id, user);
    return ok({ deleted: true });
  });
}
