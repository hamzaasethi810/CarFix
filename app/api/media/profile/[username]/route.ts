import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { profilePhotoUrl } from "@/lib/services/media";

type Params = { params: Promise<{ username: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const user = await currentUser();
    // Each call mints a signed storage URL, so it is not free to serve.
    await enforceRateLimit("read", clientIdentifier(req, user?.id));
    const { username } = await params;
    return NextResponse.redirect(await profilePhotoUrl(username), 307);
  });
}
