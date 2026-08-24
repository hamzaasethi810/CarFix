import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { regenerateBackupCodes } from "@/lib/services/mfa";

const bodySchema = z.object({ code: z.string().min(6).max(20) }).strict();

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    // Shares the MFA budget: this path verifies a code, so it is guessable in
    // exactly the same way the login path is.
    await enforceRateLimit("mfa", clientIdentifier(req, user.id));
    const { code } = await parseJson(req, bodySchema);
    return ok(await regenerateBackupCodes(user.id, code));
  });
}
