import { ok, parseJson, route } from "@/lib/api/handler";
import { requireReviewer } from "@/lib/auth/guards";
import { decideReceiptVerification } from "@/lib/services/experiences";
import { verificationDecisionSchema } from "@/lib/validation/schemas";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const reviewer = await requireReviewer();
    await enforceRateLimit("mutation", clientIdentifier(req, reviewer.id));
    const { id } = await params;
    const { decision } = await parseJson(req, verificationDecisionSchema);

    return ok(
      await decideReceiptVerification({ experienceId: id, adminId: reviewer.id, decision }),
    );
  });
}
