import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
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
    return ok({ disabled: true });
  });
}
