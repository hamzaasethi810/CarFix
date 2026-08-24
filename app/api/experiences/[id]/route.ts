import { ok, parseJson, route } from "@/lib/api/handler";
import { currentUser, requireUser } from "@/lib/auth/guards";
import { editExperience, getExperience, removeExperience } from "@/lib/services/experiences";
import { updateExperienceSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return route(async () => {
    const user = await currentUser();
    const { id } = await params;
    return ok(await getExperience(id, user?.id));
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseJson(req, updateExperienceSchema);
    return ok(await editExperience(id, user.id, input));
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await params;
    await removeExperience(id, user);
    return ok({ deleted: true });
  });
}
