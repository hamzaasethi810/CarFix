import "server-only";
import { fetchNearbyShops } from "../providers/overpass";
import { hasFreshCoverage, recordCoverage, upsertOsmShops } from "../repositories/ingest";

const MILES_TO_METRES = 1609.34;

/*
  Makes sure the searched area actually has shop records, pulling them from
  OpenStreetMap the first time anyone looks somewhere new. This is why nothing
  about the directory is hard-coded: the seed file is demo content, and real
  coverage grows wherever people search.

  Failures are swallowed on purpose. Ingestion is an enhancement to a search
  that must still return whatever is already stored.
*/
export async function ensureAreaCovered(lat: number, lng: number, radiusMiles: number) {
  if (await hasFreshCoverage(lat, lng, radiusMiles)) {
    return { ingested: false as const, created: 0 };
  }

  try {
    const shops = await fetchNearbyShops(lat, lng, radiusMiles * MILES_TO_METRES);
    const { created, total } = await upsertOsmShops(shops);
    await recordCoverage(lat, lng, radiusMiles, total);
    return { ingested: true as const, created };
  } catch (error) {
    console.error("[ingest] area coverage failed", { lat, lng, radiusMiles, error });
    return { ingested: false as const, created: 0 };
  }
}
