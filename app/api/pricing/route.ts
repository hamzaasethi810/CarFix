import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { getPricing } from "@/lib/services/experiences";

const pricingQuerySchema = z
  .object({
    mechanicId: z.string().max(64).optional(),
    serviceId: z.string().max(64).optional(),
    generationId: z.string().max(64).optional(),
    vehicleId: z.string().max(64).optional(),
    verifiedOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
  })
  .strict();

export async function GET(req: Request) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("search", clientIdentifier(req, user?.id));
    const filters = parseQuery(req, pricingQuerySchema);
    return ok(await getPricing(filters));
  });
}
