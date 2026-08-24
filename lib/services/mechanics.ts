import "server-only";
import { notFound } from "../errors";
import {
  findMechanicById,
  searchMechanics,
  searchMechanicsByName,
  type MechanicSearchParams,
} from "../repositories/mechanic";
import { countExperiences } from "../repositories/experience";
import { ensureAreaCovered } from "./ingest";
import { toMechanicView } from "./dto";

export async function search(params: MechanicSearchParams) {
  /*
    When the search is anchored to a place, make sure that place has shop
    records before querying. The first search in a new area pulls it from
    OpenStreetMap; later searches hit the cached rows.
  */
  if (params.lat !== undefined && params.lng !== undefined) {
    await ensureAreaCovered(params.lat, params.lng, params.radiusMiles ?? 20);
  }

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
      medianPrice: r.medianPrice === null ? null : Math.round(r.medianPrice),
      wouldReturnPct: r.wouldReturnPct === null ? null : Math.round(r.wouldReturnPct),
      subscribed: r.subscribed,
    })),
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
