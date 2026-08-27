import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { submitShop } from "@/lib/services/shop-submissions";
import { moderatedText } from "@/lib/validation/schemas";

const bodySchema = z
  .object({
    name: z.string().min(2).max(200),
    description: moderatedText(1000).nullable().optional(),
    address: z.string().min(3).max(200),
    city: z.string().min(1).max(100),
    // Empty outside the US; the service decides whether that is allowed for
    // the country given, because only it knows which countries use states.
    state: z.string().max(100).default(""),
    country: z.string().length(2).toUpperCase(),
    zip: z.string().max(20).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    website: z.string().max(500).nullable().optional(),
    // Sent on the second attempt, after the person has seen the possible
    // duplicate and said it is a different business.
    confirmDistinct: z.boolean().optional(),
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
