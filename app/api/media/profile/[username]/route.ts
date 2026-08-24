import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { profilePhotoUrl } from "@/lib/services/media";

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: Request, { params }: Params) {
  return route(async () => {
    const { username } = await params;
    return NextResponse.redirect(await profilePhotoUrl(username), 307);
  });
}
