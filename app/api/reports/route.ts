import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { fileReport } from "@/lib/services/moderation";
import { createReportSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("report", clientIdentifier(req, user.id));
    const input = await parseJson(req, createReportSchema);
    return ok(await fileReport(user.id, input), 201);
  });
}
