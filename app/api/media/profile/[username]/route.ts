import { route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { profilePhotoBytes } from "@/lib/services/media";
import { documentResponse } from "@/lib/api/document-response";

type Params = { params: Promise<{ username: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const user = await currentUser();
    // Each call mints a signed storage URL, so it is not free to serve.
    await enforceRateLimit("read", clientIdentifier(req, user?.id));
    const { username } = await params;
    const { bytes, contentType } = await profilePhotoBytes(username);
    // Cached briefly: a profile photo is public content, unlike a receipt.
    return documentResponse(bytes, contentType, { cacheControl: "private, max-age=300" });
  });
}
