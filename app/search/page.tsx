import { serverMapStyleUrl } from "@/lib/map/server-style";
import { getMakes } from "@/lib/services/taxonomy";
import { Discover } from "../discover";

/*
  The search tool, on its own route.

  It used to BE the front page, which left a visitor looking at a globe and a
  filter bar with no idea what the site was for. The tool is unchanged; it
  just no longer has to double as an explanation.
*/
export default async function SearchPage() {
  const makes = await getMakes();
  const mapStyle = serverMapStyleUrl();
  return <Discover makes={makes} initial={[]} mapStyle={mapStyle} />;
}
