import { after } from "next/server";
import { ok, parseQuery, route } from "@/lib/api/handler";
import { currentUser } from "@/lib/auth/guards";
import { clientIdentifier, enforceRateLimit } from "@/lib/rate-limit";
import { search } from "@/lib/services/mechanics";
import { ingestArea } from "@/lib/services/ingest";
import { mechanicSearchSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  return route(async () => {
    const user = await currentUser();
    await enforceRateLimit("search", clientIdentifier(req, user?.id));
    const params = parseQuery(req, mechanicSearchSchema);
    const result = await search({ ...params, verifiedOnly: params.verifiedOnly ?? false });

    /*
      Pulling an area in from OpenStreetMap happens after this response has
      been sent, never before it.

      Overpass is donated infrastructure and regularly takes tens of seconds.
      Waiting for it made the first search of any new area take 34 seconds and
      return nothing, because the rows arrived after the query had run. Now the
      answer is whatever is already stored, the fetch runs behind it, and the
      client asks again once it has had a moment.
    */
    if (result.ingesting && params.lat !== undefined && params.lng !== undefined) {
      const { lat, lng, radiusMiles } = params;
      after(async () => {
        await ingestArea(lat, lng, radiusMiles ?? 20);
      });
    }

    return ok(result);
  });
}
