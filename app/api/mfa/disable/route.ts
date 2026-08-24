import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { refreshSessionCookie } from "@/lib/auth";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { disable } from "@/lib/services/mfa";

const bodySchema = z.object({ code: z.string().min(6).max(20) }).strict();

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mfa", clientIdentifier(req, user.id));
    const { code } = await parseJson(req, bodySchema);
    await disable(user.id, code);

    // The cookie still says this account has a second factor. Re-mint it here
    // for the same reason /api/mfa/confirm does — middleware reads that copy,
    // and a stale one makes it act on a fact that is no longer true.
    try {
      await refreshSessionCookie({});
    } catch (error) {
      console.error("[mfa] could not refresh the session cookie", error);
    }

    return ok({ disabled: true });
  });
}
