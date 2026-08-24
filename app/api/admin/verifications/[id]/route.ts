import { ok, parseJson, route } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/guards";
import { decideReceiptVerification } from "@/lib/services/experiences";
import { verificationDecisionSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const { decision } = await parseJson(req, verificationDecisionSchema);

    return ok(
      await decideReceiptVerification({ experienceId: id, adminId: admin.id, decision }),
    );
  });
}
