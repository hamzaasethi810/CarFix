import { serverMapStyleUrl } from "@/lib/map/server-style";
import { getMakes } from "@/lib/services/taxonomy";
import { Discover } from "./discover";

// The map is the front page: shops as pins, filters and results on glass above it.
export default async function HomePage() {
  /*
    Only the taxonomy is fetched here.

    This used to run a shop search with no location, which is the one shape of
    the query that cannot use the geographic index — a scan of every shop in
    the database, on every visit to the home page, to produce results that the
    browser immediately replaced once it knew where the visitor was. The map
    starts empty and fills in as soon as there is somewhere to centre it on.
  */
  const makes = await getMakes();

  /*
    The tile style is resolved here, on the server, and handed down as a
    finished URL.

    The key still reaches the browser — it must, since the browser is what
    requests tiles — but this way it does not need a NEXT_PUBLIC_ prefix,
    which Vercel refuses on a variable marked Sensitive. The domain allowlist
    in the MapTiler dashboard is what actually protects it.
  */
  const mapStyle = serverMapStyleUrl();

  return <Discover makes={makes} initial={[]} mapStyle={mapStyle} />;
}
