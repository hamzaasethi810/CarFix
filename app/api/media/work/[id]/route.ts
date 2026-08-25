import { route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { workPhotoBytes } from "@/lib/services/engagement";
import { documentResponse } from "@/lib/api/document-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("read", clientIdentifier(req, user?.id));
    const { id } = await params;
    const { bytes, contentType } = await workPhotoBytes(id);
    // Cached briefly: a profile photo is public content, unlike a receipt.
    return documentResponse(bytes, contentType, { cacheControl: "private, max-age=300" });
  });
}
