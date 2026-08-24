import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { removeReply, replyToExperience } from "@/lib/services/engagement";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ body: z.string().min(2).max(2000) }).strict();

export async function PUT(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    const { body } = await parseJson(req, bodySchema);
    return ok(await replyToExperience(id, user.id, body));
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    await removeReply(id, user.id);
    return ok({ deleted: true });
  });
}
