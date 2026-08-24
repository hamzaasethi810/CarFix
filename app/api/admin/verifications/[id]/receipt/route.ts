import { ok, route } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/guards";
import { getReceiptViewUrl } from "@/lib/services/experiences";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return route(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    return ok(await getReceiptViewUrl(id, admin.id));
  });
}
