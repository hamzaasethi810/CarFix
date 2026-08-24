import { ok, parseJson, route } from "@/lib/api/handler";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { register } from "@/lib/services/account";
import { registerSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  return route(async () => {
    await enforceRateLimit("register", clientIdentifier(req));
    const input = await parseJson(req, registerSchema);
    const result = await register(input);
    return ok(result, 201);
  });
}
