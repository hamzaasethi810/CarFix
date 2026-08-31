import { checkBotId } from "botid/server";
import { ok, parseJson, route } from "@/lib/api/handler";
import { forbidden } from "@/lib/errors";
import { clientIdentifier, clientIp, enforceRateLimit } from "@/lib/rate-limit";
import { register } from "@/lib/services/account";
import { registerSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  return route(async () => {
    await enforceRateLimit("register", clientIdentifier(req));

    /*
      Bot check before anything is written.

      The rate limit alone caps a single address at 5 sign-ups an hour, which a
      script with rotating IPs walks straight through. This is the part that
      costs an automated client something, and it is invisible to a real one:
      no puzzle, no checkbox.

      Deliberately after the rate limit and before the schema parse, so a flood
      is rejected on the cheapest check first and a bot never reaches the
      database.
    */
    const bot = await checkBotId();
    if (bot.isBot) throw forbidden();

    const input = await parseJson(req, registerSchema);
    const result = await register({ ...input, ip: clientIp(req) });
    return ok(result, 201);
  });
}
