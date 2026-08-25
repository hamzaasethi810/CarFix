import { route } from "@/lib/api/handler";
import { requireReviewer } from "@/lib/auth/guards";
import { documentResponse } from "@/lib/api/document-response";
import { readReceiptForReview } from "@/lib/services/experiences";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  return route(async () => {
    const reviewer = await requireReviewer();
    await enforceRateLimit("mutation", clientIdentifier(req, reviewer.id));
    const { id } = await params;
    const { bytes, contentType } = await readReceiptForReview(id, reviewer.id);
    return documentResponse(bytes, contentType);
  });
}
