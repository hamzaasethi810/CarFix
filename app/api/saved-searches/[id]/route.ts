import { ok, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { markSeen, removeSavedSearch } from "@/lib/services/engagement";

type Params = { params: Promise<{ id: string }> };

// Marks the alert as read, so the same reports are not counted again.
export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    await markSeen(id, user.id);
    return ok({ seen: true });
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const { id } = await params;
    await removeSavedSearch(id, user.id);
    return ok({ deleted: true });
  });
}
