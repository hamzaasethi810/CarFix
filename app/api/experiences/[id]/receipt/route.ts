import { after } from "next/server";
import { ok, parseForm, requireFile, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { autoCheckReceipt, uploadReceipt } from "@/lib/services/experiences";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("receiptUpload", clientIdentifier(req, user.id));

    const { id } = await params;
    const form = await parseForm(req);
    const file = requireFile(form, "file");

    const result = await uploadReceipt(id, user.id, file);

    /*
      OCR takes seconds, so it runs after the response rather than making the
      owner wait. The experience is already PENDING; the check can only move it
      to VERIFIED, never to REJECTED, so a slow or failed run just leaves it
      for a human.
    */
    after(async () => {
      try {
        await autoCheckReceipt(id, result.bytes);
      } catch (error) {
        console.error("[receipt] automated check failed", { experienceId: id, error });
      }
    });

    return ok({ status: result.status }, 202);
  });
}
