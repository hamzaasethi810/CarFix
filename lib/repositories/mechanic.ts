import "server-only";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../db";

export type MechanicSearchRow = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  distanceMiles: number | null;
  experienceCount: number;
  verifiedCount: number;
  avgRating: number | null;
  medianPrice: number | null;
  wouldReturnPct: number | null;
};

export type MechanicSearchParams = {
  serviceId?: string;
  /** Exact generation, e.g. only the W212R facelift. */
  generationId?: string;
  /** Whole platform, e.g. every W212 E-Class across both facelift halves. */
  platformId?: string;
  makeId?: string;
  modelId?: string;
  year?: number;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  verifiedOnly: boolean;
  minRating?: number;
  maxPrice?: number;
  limit: number;
  offset: number;
};

// Filtering, distance, and aggregation all run in Postgres. The client never
// receives more than one page of already-summarized rows.
export async function searchMechanics(p: MechanicSearchParams) {
  const hasGeo = p.lat !== undefined && p.lng !== undefined;

  const distance = hasGeo
    ? Prisma.sql`3959 * acos(least(1, greatest(-1,
        cos(radians(${p.lat})) * cos(radians(m.lat)) *
        cos(radians(m.lng) - radians(${p.lng})) +
        sin(radians(${p.lat})) * sin(radians(m.lat))
      )))`
    : Prisma.sql`NULL::double precision`;

  const expFilters: Prisma.Sql[] = [Prisma.sql`e."deletedAt" IS NULL`];
  if (p.serviceId) expFilters.push(Prisma.sql`e."serviceId" = ${p.serviceId}`);
  if (p.verifiedOnly) expFilters.push(Prisma.sql`e."verificationStatus" = 'VERIFIED'`);
  if (p.generationId) expFilters.push(Prisma.sql`v."generationId" = ${p.generationId}`);
  // Platform widens the net to every generation sharing the chassis, so a
  // W212 and a W212R contribute to the same result.
  if (p.platformId) expFilters.push(Prisma.sql`g."platformId" = ${p.platformId}`);
  if (p.makeId) expFilters.push(Prisma.sql`v."makeId" = ${p.makeId}`);
  if (p.modelId) expFilters.push(Prisma.sql`v."modelId" = ${p.modelId}`);
  if (p.year !== undefined) expFilters.push(Prisma.sql`v."year" = ${p.year}`);

  const havingFilters: Prisma.Sql[] = [];
  if (p.minRating !== undefined)
    havingFilters.push(Prisma.sql`COALESCE(AVG(e."overallRating"), 0) >= ${p.minRating}`);
  if (p.maxPrice !== undefined)
    havingFilters.push(
      Prisma.sql`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e."totalPrice") <= ${p.maxPrice}`,
    );

  const hasExperienceFilter = Boolean(
    p.serviceId ||
      p.generationId ||
      p.platformId ||
      p.makeId ||
      p.modelId ||
      p.year !== undefined ||
      p.verifiedOnly ||
      p.minRating !== undefined ||
      p.maxPrice !== undefined,
  );

  const radiusFilter =
    hasGeo && p.radiusMiles !== undefined
      ? Prisma.sql`WHERE "distanceMiles" <= ${p.radiusMiles}`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<MechanicSearchRow[]>(Prisma.sql`
    WITH stats AS (
      SELECT
        e."mechanicId" AS mechanic_id,
        COUNT(*)::int AS experience_count,
        COUNT(*) FILTER (WHERE e."verificationStatus" = 'VERIFIED')::int AS verified_count,
        AVG(e."overallRating")::float AS avg_rating,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e."totalPrice")::float AS median_price,
        (COUNT(*) FILTER (WHERE e."wouldReturn")::float / NULLIF(COUNT(*), 0) * 100) AS would_return_pct
      FROM "MechanicExperience" e
      JOIN "Vehicle" v ON v.id = e."vehicleId"
      JOIN "Generation" g ON g.id = v."generationId"
      WHERE ${Prisma.join(expFilters, " AND ")}
      GROUP BY e."mechanicId"
      ${havingFilters.length ? Prisma.sql`HAVING ${Prisma.join(havingFilters, " AND ")}` : Prisma.empty}
    )
    SELECT * FROM (
      SELECT
        m.id,
        m.name,
        m.city,
        m.state,
        m.lat,
        m.lng,
        ${distance} AS "distanceMiles",
        COALESCE(s.experience_count, 0) AS "experienceCount",
        COALESCE(s.verified_count, 0) AS "verifiedCount",
        s.avg_rating AS "avgRating",
        s.median_price AS "medianPrice",
        s.would_return_pct AS "wouldReturnPct"
      FROM "Mechanic" m
      ${
        // Any experience filter narrows the result set to mechanics that have
        // matching work; with no filters, mechanics with no experiences still list.
        hasExperienceFilter
          ? Prisma.sql`JOIN stats s ON s.mechanic_id = m.id`
          : Prisma.sql`LEFT JOIN stats s ON s.mechanic_id = m.id`
      }
      WHERE m."deletedAt" IS NULL
    ) AS ranked
    ${radiusFilter}
    ORDER BY
      ${hasGeo ? Prisma.sql`"distanceMiles" ASC NULLS LAST,` : Prisma.empty}
      "experienceCount" DESC,
      "avgRating" DESC NULLS LAST
    LIMIT ${p.limit} OFFSET ${p.offset}
  `);

  return rows;
}

export const findMechanicById = (id: string) =>
  prisma.mechanic.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      lat: true,
      lng: true,
      phone: true,
      website: true,
      hours: true,
      specialties: { select: { service: { select: { id: true, name: true } } } },
    },
  });

export const mechanicExists = async (id: string) =>
  Boolean(
    await prisma.mechanic.findFirst({ where: { id, deletedAt: null }, select: { id: true } }),
  );

export type PricingStats = {
  count: number;
  verifiedCount: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
};

export async function pricingStats(filters: {
  mechanicId?: string;
  serviceId?: string;
  generationId?: string;
  platformId?: string;
  vehicleId?: string;
  verifiedOnly?: boolean;
}): Promise<PricingStats> {
  const conds: Prisma.Sql[] = [Prisma.sql`e."deletedAt" IS NULL`];
  if (filters.mechanicId) conds.push(Prisma.sql`e."mechanicId" = ${filters.mechanicId}`);
  if (filters.serviceId) conds.push(Prisma.sql`e."serviceId" = ${filters.serviceId}`);
  if (filters.vehicleId) conds.push(Prisma.sql`e."vehicleId" = ${filters.vehicleId}`);
  if (filters.generationId) conds.push(Prisma.sql`v."generationId" = ${filters.generationId}`);
  if (filters.platformId) conds.push(Prisma.sql`g."platformId" = ${filters.platformId}`);
  if (filters.verifiedOnly) conds.push(Prisma.sql`e."verificationStatus" = 'VERIFIED'`);

  const [row] = await prisma.$queryRaw<PricingStats[]>(Prisma.sql`
    SELECT
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE e."verificationStatus" = 'VERIFIED')::int AS "verifiedCount",
      MIN(e."totalPrice")::float AS min,
      MAX(e."totalPrice")::float AS max,
      AVG(e."totalPrice")::float AS avg,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e."totalPrice")::float AS median
    FROM "MechanicExperience" e
    JOIN "Vehicle" v ON v.id = e."vehicleId"
    JOIN "Generation" g ON g.id = v."generationId"
    WHERE ${Prisma.join(conds, " AND ")}
  `);

  return row ?? { count: 0, verifiedCount: 0, min: null, max: null, avg: null, median: null };
}
