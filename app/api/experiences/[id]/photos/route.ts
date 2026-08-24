import { z } from "zod";
import { ok, parseForm, requireFile, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { removeWorkPhoto, uploadWorkPhoto } from "@/lib/services/engagement";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("workPhoto", clientIdentifier(req, user.id));
    const { id } = await params;
    const form = await parseForm(req);
    const file = requireFile(form, "file");
    return ok(await uploadWorkPhoto(id, user.id, file), 201);
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const photoId = z.string().min(1).max(64).parse(new URL(req.url).searchParams.get("photoId"));
    await removeWorkPhoto(photoId, user.id);
    return ok({ deleted: true });
  });
}
