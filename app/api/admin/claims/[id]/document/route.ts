import { ok, route } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/guards";
import { getClaimDocumentUrl } from "@/lib/services/shops";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return route(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    return ok(await getClaimDocumentUrl(id, admin.id));
  });
}
