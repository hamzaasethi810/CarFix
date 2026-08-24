import { ok, route } from "@/lib/api/handler";
import { getMechanic } from "@/lib/services/mechanics";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return route(async () => {
    const { id } = await params;
    return ok(await getMechanic(id));
  });
}
