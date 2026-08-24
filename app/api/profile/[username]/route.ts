import { ok, route } from "@/lib/api/handler";
import { getPublicProfile } from "@/lib/services/account";

type Params = { params: Promise<{ username: string }> };

export async function GET(_req: Request, { params }: Params) {
  return route(async () => {
    const { username } = await params;
    return ok(await getPublicProfile(username));
  });
}
