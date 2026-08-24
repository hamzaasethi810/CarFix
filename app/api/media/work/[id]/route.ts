import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { workPhotoUrl } from "@/lib/services/engagement";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("read", clientIdentifier(req, user?.id));
    const { id } = await params;
    return NextResponse.redirect(await workPhotoUrl(id), 307);
  });
}
