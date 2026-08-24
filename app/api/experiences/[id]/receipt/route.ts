import { ok, parseForm, requireFile, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { uploadReceipt } from "@/lib/services/experiences";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("receiptUpload", clientIdentifier(req, user.id));

    const { id } = await params;
    const form = await parseForm(req);
    const file = requireFile(form, "file");

    return ok(await uploadReceipt(id, user.id, file), 202);
  });
}
