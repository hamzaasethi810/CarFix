import { serverMapStyleUrl } from "@/lib/map/server-style";
import { getMakes } from "@/lib/services/taxonomy";
import { Discover } from "../discover";

/*
  The search tool, on its own route.

  It reads the query string the landing filter writes, so choosing a make,
  model and generation on the home page arrives here already narrowed rather
  than dropping the visitor back at an empty form.
*/
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value.length <= 64 ? value : undefined;
  };

  const makes = await getMakes();
  const mapStyle = serverMapStyleUrl();

  return (
    <Discover
      makes={makes}
      initial={[]}
      mapStyle={mapStyle}
      initialFilters={{
        makeId: one("makeId"),
        modelId: one("modelId"),
        generationId: one("generationId"),
        platformId: one("platformId"),
        serviceId: one("serviceId"),
      }}
    />
  );
}
