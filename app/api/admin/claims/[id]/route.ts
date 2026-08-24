import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/guards";
import { decideShopClaim } from "@/lib/services/shops";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]) }).strict();

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const admin = await requireAdmin();
    await enforceRateLimit("mutation", clientIdentifier(req, admin.id));
    const { id } = await params;
    const { decision } = await parseJson(req, bodySchema);
    return ok(
      await decideShopClaim({ claimId: id, adminId: admin.id, approve: decision === "APPROVED" }),
    );
  });
}
