import "server-only";
import { notFound } from "../errors";
import {
  findMechanicById,
  searchMechanics,
  searchMechanicsByName,
  type MechanicSearchParams,
} from "../repositories/mechanic";
import { countExperiences } from "../repositories/experience";
import { areaIsCovered } from "./ingest";
import { toMechanicView } from "./dto";

export async function search(params: MechanicSearchParams) {
  /*
    The search never waits for OpenStreetMap.

    It used to call ingestion first and block on it, which meant the first
    person to look anywhere new waited for Overpass — measured at 34 seconds
    against a live deployment, and answering with nothing, because the rows
    landed after the query had already run. Overpass is donated infrastructure
    and is regularly that slow; a page cannot be built on it responding
    quickly.

    So this answers from what is stored, and reports whether the area still
    needs pulling in. The caller does that after the response has gone out, and
    the client asks again once it has had a moment.
  */
  const needsIngest =
    params.lat !== undefined &&
    params.lng !== undefined &&
    !(await areaIsCovered(params.lat, params.lng, params.radiusMiles ?? 20));

  const rows = await searchMechanics(params);
  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      state: r.state,
      lat: r.lat,
      lng: r.lng,
      distanceMiles: r.distanceMiles === null ? null : Math.round(r.distanceMiles * 10) / 10,
      experienceCount: r.experienceCount,
      verifiedCount: r.verifiedCount,
      avgRating: r.avgRating === null ? null : Math.round(r.avgRating * 10) / 10,
      fromPrice: r.fromPrice === null ? null : Math.round(r.fromPrice),
      wouldReturnPct: r.wouldReturnPct === null ? null : Math.round(r.wouldReturnPct),
      subscribed: r.subscribed,
      confirmed: r.confirmed,
    })),
    /*
      True while shops for this area are still being fetched. The client shows
      that it is still looking and asks again shortly, rather than presenting
      an empty area as though it had been searched.
    */
    ingesting: needsIngest,
    sort: params.sort,
    limit: params.limit,
    offset: params.offset,
  };
}

export async function getMechanic(id: string) {
  const mechanic = await findMechanicById(id);
  if (!mechanic) throw notFound();

  const [experienceCount, verifiedCount] = await Promise.all([
    countExperiences({ mechanicId: id }),
    countExperiences({ mechanicId: id, verifiedOnly: true }),
  ]);

  return { ...toMechanicView(mechanic), experienceCount, verifiedCount };
}

export async function suggest(query: string, limit = 8) {
  const trimmed = query.trim();
  // Below two characters the result set is meaninglessly broad.
  if (trimmed.length < 2) return [];

  const rows = await searchMechanicsByName(trimmed, limit);
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    place: [m.city, m.state].filter((p) => p && p.trim()).join(", "),
  }));
}
