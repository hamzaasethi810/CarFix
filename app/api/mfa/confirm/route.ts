import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
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
    return ok(await completeEnrolment(user.id, code));
  });
}
