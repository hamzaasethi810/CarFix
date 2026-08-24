import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { submitShop } from "@/lib/services/shop-submissions";

const bodySchema = z
  .object({
    name: z.string().min(2).max(200),
    description: z.string().max(1000).nullable().optional(),
    address: z.string().min(3).max(200),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    zip: z.string().max(20).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    website: z.string().max(500).nullable().optional(),
  })
  .strict();

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    // Geocoding each submission means this shares the geocoder's budget.
    await enforceRateLimit("shopSubmit", clientIdentifier(req, user.id));
    const input = await parseJson(req, bodySchema);
    return ok(await submitShop(user.id, input), 201);
  });
}
