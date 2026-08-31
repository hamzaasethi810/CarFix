import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api/handler";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { completeVerification } from "@/lib/services/email-verification";

const schema = z.object({ token: z.string().min(16).max(200) }).strict();

/*
  Confirms an address from the raw token in the email.

  POST, not GET: link scanners in mail clients and corporate gateways follow
  every URL in a message, and a GET here would let them spend the token before
  the recipient ever clicks. The page at /verify holds the token and posts it.

  Rate-limited on the password-reset bucket: same shape of secret, same
  brute-force surface.
*/
export async function POST(req: Request) {
  return route(async () => {
    await enforceRateLimit("passwordReset", clientIdentifier(req));
    const { token } = await parseJson(req, schema);
    await completeVerification(token);
    return ok({ verified: true });
  });
}
