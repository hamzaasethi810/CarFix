import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { changeUsername } from "@/lib/services/account";
import { changeUsernameSchema } from "@/lib/validation/schemas";

/*
  Changing the @handle from inside the account.

  Its own route rather than folded into PATCH /api/profile, because a handle is
  unique and public: it needs its own tight budget (handle-squatting churn is
  the abuse, not ordinary edits) and it can fail as "taken", which the display
  name never can.
*/
export async function PUT(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("usernameChange", clientIdentifier(req, user.id));
    const { username } = await parseJson(req, changeUsernameSchema);
    return ok(await changeUsername(user.id, username));
  });
}
