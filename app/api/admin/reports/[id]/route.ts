import { ok, parseJson, route } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/guards";
import { decideReport } from "@/lib/services/moderation";
import { resolveReportSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const { status } = await parseJson(req, resolveReportSchema);
    return ok(await decideReport({ reportId: id, adminId: admin.id, status }));
  });
}
