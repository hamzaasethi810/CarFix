import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { updateShopDetails } from "@/lib/services/shops";

const bodySchema = z
  .object({
    name: z.string().min(2).max(200),
    address: z.string().min(3).max(200),
    city: z.string().min(1).max(100),
    // Empty outside the US; the service decides whether that is allowed for
    // the country given, because only it knows which countries use states.
    state: z.string().max(100).default(""),
    country: z.string().length(2).toUpperCase(),
    zip: z.string().max(20).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    website: z.string().max(500).nullable().optional(),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  return route(async () => {
    const user = await requireUser();
    // Each save geocodes, so it shares the geocoder's conservative budget.
    await enforceRateLimit("geocode", clientIdentifier(req, user.id));
    const { id } = await params;
    const input = await parseJson(req, bodySchema);
    // Ownership is checked in the service, against the database.
    return ok(await updateShopDetails(id, user.id, input));
  });
}
