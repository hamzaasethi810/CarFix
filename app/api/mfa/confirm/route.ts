import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { refreshSessionCookie } from "@/lib/auth";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { completeEnrolment } from "@/lib/services/mfa";

const bodySchema = z.object({ code: z.string().min(6).max(10) }).strict();

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    // Brute-forcing a 6-digit code is the obvious attack; this is the cap.
    await enforceRateLimit("mfa", clientIdentifier(req, user.id));
    const { code } = await parseJson(req, bodySchema);
    const result = await completeEnrolment(user.id, code);

    /*
      The browser is still holding a cookie that says this account has no
      second factor, and middleware believes it. Re-mint it here, in the same
      response that turns MFA on, so the next navigation is not bounced back
      to enrolment.

      Enrolment is already committed at this point, so a failure to refresh
      must not fail the request — it only costs the person one sign-in.
    */
    try {
      await refreshSessionCookie({});
    } catch (error) {
      console.error("[mfa] could not refresh the session cookie", error);
    }

    return ok(result);
  });
}
