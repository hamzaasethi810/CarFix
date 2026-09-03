import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { changePassword } from "@/lib/services/account";
import { changePasswordSchema } from "@/lib/validation/schemas";

/*
  Changing a password from inside the account.

  Rate limited on the login budget rather than the ordinary mutation budget:
  this endpoint takes a current password and says whether it was right, which
  makes it a password oracle for anyone who has got hold of a session.
*/
export async function PUT(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("login", clientIdentifier(req, user.id));
    const input = await parseJson(req, changePasswordSchema);
    await changePassword(user.id, input.currentPassword, input.newPassword);
    return ok({ changed: true });
  });
}
