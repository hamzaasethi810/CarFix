import { ok, parseJson, parseQuery, route } from "@/lib/api/handler";
import { currentUser, requireUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { browseExperiences, submitExperience } from "@/lib/services/experiences";
import { createExperienceSchema, experienceListSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("search", clientIdentifier(req, user?.id));
    const filters = parseQuery(req, experienceListSchema);
    return ok(await browseExperiences(filters, user?.id));
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const user = await requireUser();
    await enforceRateLimit("experienceSubmit", clientIdentifier(req, user.id));
    const input = await parseJson(req, createExperienceSchema);
    return ok(await submitExperience(user.id, input), 201);
  });
}
