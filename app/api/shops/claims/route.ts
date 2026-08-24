import { z } from "zod";
import { ok, parseForm, requireFile, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { submitClaim } from "@/lib/services/shops";

const fieldsSchema = z.object({
  mechanicId: z.string().min(1).max(64),
  businessName: z.string().min(2).max(200),
  contactPhone: z.string().max(40).optional(),
  note: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("shopClaim", clientIdentifier(req, user.id));

    const form = await parseForm(req);
    const fields = fieldsSchema.parse({
      mechanicId: form.get("mechanicId"),
      businessName: form.get("businessName"),
      contactPhone: form.get("contactPhone") || undefined,
      note: form.get("note") || undefined,
    });
    const document = requireFile(form, "document");

    return ok(await submitClaim(user.id, fields, document), 202);
  });
}
