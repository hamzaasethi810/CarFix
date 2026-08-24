import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api/handler";
import {
  getDrivetrains,
  getEngines,
  getGenerations,
  getMakes,
  getModels,
  getServices,
  getTrims,
} from "@/lib/services/taxonomy";

const querySchema = z
  .object({
    resource: z.enum(["makes", "models", "generations", "trims", "engines", "drivetrains", "services"]),
    makeId: z.string().max(64).optional(),
    modelId: z.string().max(64).optional(),
    generationId: z.string().max(64).optional(),
  })
  .strict();

export async function GET(req: Request) {
  return route(async () => {
    const q = parseQuery(req, querySchema);

    switch (q.resource) {
      case "makes":
        return ok(await getMakes());
      case "models":
        return ok(q.makeId ? await getModels(q.makeId) : []);
      case "generations":
        return ok(q.modelId ? await getGenerations(q.modelId) : []);
      case "trims":
        return ok(q.generationId ? await getTrims(q.generationId) : []);
      case "engines":
        return ok(await getEngines());
      case "drivetrains":
        return ok(await getDrivetrains());
      case "services":
        return ok(await getServices());
    }
  });
}
