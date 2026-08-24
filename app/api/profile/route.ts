import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { deleteAccount, editProfile, getOwnProfile } from "@/lib/services/account";
import { updateProfileSchema } from "@/lib/validation/schemas";

export async function GET() {
  return route(async () => {
    const user = await requireUser();
    return ok(await getOwnProfile(user.id));
  });
}

export async function PATCH(req: Request) {
  return route(async () => {
    const user = await requireUser();
    const input = await parseJson(req, updateProfileSchema);
    return ok(await editProfile(user.id, input));
  });
}

export async function DELETE() {
  return route(async () => {
    const user = await requireUser();
    await deleteAccount(user.id);
    return ok({ deleted: true });
  });
}
