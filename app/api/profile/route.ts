import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { deleteAccount, editProfile, getOwnProfile } from "@/lib/services/account";
import { updateProfileSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("read", clientIdentifier(req, user.id));
    return ok(await getOwnProfile(user.id));
  });
}

export async function PATCH(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const input = await parseJson(req, updateProfileSchema);
    return ok(await editProfile(user.id, input));
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const user = await requireUser();
    // Irreversible, so this gets its own very small budget.
    await enforceRateLimit("accountDelete", clientIdentifier(req, user.id));
    await deleteAccount(user.id);
    return ok({ deleted: true });
  });
}
