import { ok, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { beginEnrolment, getMfaStatus } from "@/lib/services/mfa";

export async function GET() {
  return route(async () => {
    const user = await requireUser();
    return ok(await getMfaStatus(user.id));
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mfa", clientIdentifier(req, user.id));
    return ok(await beginEnrolment(user.id));
  });
}
