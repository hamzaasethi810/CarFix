import { ok, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { getMyShops } from "@/lib/services/shops";

export async function GET() {
  return route(async () => {
    const user = await requireUser();
    return ok(await getMyShops(user.id));
  });
}
