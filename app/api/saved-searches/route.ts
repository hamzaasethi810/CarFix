import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { getSavedSearches, saveSearch } from "@/lib/services/engagement";

const bodySchema = z
  .object({
    label: z.string().min(1).max(80),
    serviceId: z.string().max(64).nullable().optional(),
    generationId: z.string().max(64).nullable().optional(),
    platformId: z.string().max(64).nullable().optional(),
    lat: z.coerce.number().min(-90).max(90).nullable().optional(),
    lng: z.coerce.number().min(-180).max(180).nullable().optional(),
    radiusMiles: z.coerce.number().int().min(1).max(200).nullable().optional(),
  })
  .strict();

export async function GET(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("read", clientIdentifier(req, user.id));
    return ok(await getSavedSearches(user.id));
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("mutation", clientIdentifier(req, user.id));
    const input = await parseJson(req, bodySchema);
    return ok(await saveSearch(user.id, input), 201);
  });
}
