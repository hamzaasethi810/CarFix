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
  /** The lowest price this shop lists, for the filtered service if one is set. */
  fromPrice: number | null;
  wouldReturnPct: number | null;
  /** True for a shop with an active subscription — the golden mark. */
  subscribed: boolean;
  /** False while a publicly submitted listing is still unconfirmed. */
  confirmed: boolean;
};

/*
  How the results are ordered.

  "relevant" is the only one that weighs several things at once, and the only
  one where a subscribing shop is lifted. The explicit sorts are literal: if
  someone asks for cheapest first, the cheapest is first, because a paid
  placement dressed up as a price sort is a lie about the data.
*/
export type MechanicSort = "relevant" | "price" | "rating" | "distance";

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
  /** Restrict to subscribing shops. */
  subscribedOnly?: boolean;
  minRating?: number;
  maxPrice?: number;
  sort?: MechanicSort;
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

  /*
    Whether a filter is about reported work specifically.

    A service filter deliberately is NOT one of these. Asking for "Full car
    wrap" should surface shops that do wraps, not only shops somebody has
    already reviewed for a wrap — otherwise a newly ingested area looks empty
    and the directory cannot bootstrap itself. The service condition is applied
    further down against the shop's specialties as well as its experiences.

    Verified-only is different: a claim about verified pricing cannot be
    satisfied by a shop merely listing the service, so it keeps the strict join.
  */
  const hasExperienceFilter = Boolean(
      p.generationId ||
      p.platformId ||
      p.makeId ||
      p.modelId ||
      p.year !== undefined ||
      p.verifiedOnly ||
      p.minRating !== undefined ||
      p.maxPrice !== undefined,
  );

  /*
    Matches a shop that has reported work for this service OR lists it as
    something it does. When a stricter filter is already in play the strict
    join has narrowed things down, and this simply confirms the service.
  */
  const serviceFilter = p.serviceId
    ? hasExperienceFilter
      ? Prisma.sql` AND EXISTS (
          SELECT 1 FROM "MechanicExperience" me
          WHERE me."mechanicId" = m.id AND me."serviceId" = ${p.serviceId} AND me."deletedAt" IS NULL
        )`
      : Prisma.sql` AND (
          EXISTS (
            SELECT 1 FROM "MechanicExperience" me
            WHERE me."mechanicId" = m.id AND me."serviceId" = ${p.serviceId} AND me."deletedAt" IS NULL
          )
          OR EXISTS (
            SELECT 1 FROM "MechanicSpecialty" ms
            WHERE ms."mechanicId" = m.id AND ms."serviceId" = ${p.serviceId}
          )
        )`
    : Prisma.empty;

  const subscribedFilter = p.subscribedOnly
    ? Prisma.sql` AND m."subscriptionStatus" = 'ACTIVE'`
    : Prisma.empty;

  const radiusFilter =
    hasGeo && p.radiusMiles !== undefined
      ? Prisma.sql`WHERE "distanceMiles" <= ${p.radiusMiles}`
      : Prisma.empty;

  /*
    A bounding box on (lat, lng) can use the index; the haversine expression
    cannot. Narrowing to the box first means the trigonometry only runs on
    candidates, which keeps the query flat as the shop table grows.
    ~69 miles per degree of latitude; longitude degrees shrink with cos(lat).
  */
  const boundingBox =
    hasGeo && p.radiusMiles !== undefined
      ? (() => {
          const latDelta = p.radiusMiles / 69;
          const lngDelta = p.radiusMiles / (69 * Math.max(Math.cos((p.lat! * Math.PI) / 180), 0.01));
          return Prisma.sql`
            AND m.lat BETWEEN ${p.lat! - latDelta} AND ${p.lat! + latDelta}
            AND m.lng BETWEEN ${p.lng! - lngDelta} AND ${p.lng! + lngDelta}`;
        })()
      : Prisma.empty;

  /*
    Vehicle and Generation are only needed when the search is narrowed by car.
    Joining them regardless meant every search hashed the whole vehicle table
    against every experience row for nothing.
  */
  const needsVehicleJoin = Boolean(
    p.generationId || p.platformId || p.makeId || p.modelId || p.year !== undefined,
  );
  const vehicleJoins = needsVehicleJoin
    ? Prisma.sql`
        JOIN "Vehicle" v ON v.id = e."vehicleId"
        JOIN "Generation" g ON g.id = v."generationId"`
    : Prisma.empty;

  /*
    The shop's own asking price, for the service being filtered on if there is
    one. This is what the price sort orders by — the figure the shop publishes,
    not an average of what owners happened to report.
  */
  const priceScope = p.serviceId
    ? Prisma.sql`AND sp."serviceId" = ${p.serviceId}`
    : Prisma.empty;

  const orderBy = (() => {
    const distanceFirst = hasGeo
      ? Prisma.sql`"distanceMiles" ASC NULLS LAST,`
      : Prisma.empty;

    switch (p.sort) {
      case "price":
        // A shop that publishes no price cannot be ranked by price, so it goes
        // last rather than being treated as free.
        return Prisma.sql`"fromPrice" ASC NULLS LAST, ${distanceFirst} "avgRating" DESC NULLS LAST`;
      case "rating":
        // Ties on rating break towards the shop with more reports behind it.
        return Prisma.sql`"avgRating" DESC NULLS LAST, "experienceCount" DESC, ${distanceFirst} name ASC`;
      case "distance":
        return Prisma.sql`${distanceFirst} "experienceCount" DESC, "avgRating" DESC NULLS LAST`;
      default:
        /*
          Relevance, which is the only ordering that reads the filters.

          Shops that have actually been reported on for the chosen service rank
          above shops that merely list it, because a report is evidence and a
          specialty is a claim. Everything else being equal it prefers nearer,
          better-evidenced, better-rated shops, and a subscribing shop is
          lifted — here and nowhere else.
        */
        return Prisma.sql`
          subscribed DESC,
          "matchesFilter" DESC,
          ${distanceFirst}
          "experienceCount" DESC,
          "avgRating" DESC NULLS LAST`;
    }
  })();

  /** Whether this shop has reported work for the service asked about. */
  const matchesFilter = p.serviceId
    ? Prisma.sql`(COALESCE(s.experience_count, 0) > 0)`
    : Prisma.sql`false`;

  const rows = await prisma.$queryRaw<MechanicSearchRow[]>(Prisma.sql`
    /*
      Narrow to the shops in range FIRST, then aggregate only their reports.

      The aggregate used to run across the whole experience table and every
      shop in the database before the geography was applied, so a search of one
      city paid for every report ever filed. Scoping it to the candidates keeps
      the cost tied to the size of the area being looked at rather than the
      size of the site.
    */
    WITH candidates AS (
      SELECT
        m.id, m.name, m.city, m.state, m.lat, m.lng,
        (m."subscriptionStatus" = 'ACTIVE') AS subscribed,
        (m."listingStatus" = 'CONFIRMED') AS confirmed,
        ${distance} AS "distanceMiles"
      FROM "Mechanic" m
      WHERE m."deletedAt" IS NULL${boundingBox}${subscribedFilter}${serviceFilter}
    ),
    in_range AS (
      SELECT * FROM candidates ${radiusFilter}
    ),
    stats AS (
      SELECT
        e."mechanicId" AS mechanic_id,
        COUNT(*)::int AS experience_count,
        COUNT(*) FILTER (WHERE e."verificationStatus" = 'VERIFIED')::int AS verified_count,
        AVG(e."overallRating")::float AS avg_rating,
        (COUNT(*) FILTER (WHERE e."wouldReturn")::float / NULLIF(COUNT(*), 0) * 100) AS would_return_pct
      FROM "MechanicExperience" e
      JOIN in_range r ON r.id = e."mechanicId"
      ${vehicleJoins}
      WHERE ${Prisma.join(expFilters, " AND ")}
      GROUP BY e."mechanicId"
      ${havingFilters.length ? Prisma.sql`HAVING ${Prisma.join(havingFilters, " AND ")}` : Prisma.empty}
    )
    SELECT
      r.id, r.name, r.city, r.state, r.lat, r.lng,
      r.subscribed, r.confirmed, r."distanceMiles",
      COALESCE(s.experience_count, 0) AS "experienceCount",
      COALESCE(s.verified_count, 0) AS "verifiedCount",
      s.avg_rating AS "avgRating",
      price.from_price AS "fromPrice",
      s.would_return_pct AS "wouldReturnPct",
      ${matchesFilter} AS "matchesFilter"
    FROM in_range r
    ${
      hasExperienceFilter
        ? Prisma.sql`JOIN stats s ON s.mechanic_id = r.id`
        : Prisma.sql`LEFT JOIN stats s ON s.mechanic_id = r.id`
    }
    LEFT JOIN LATERAL (
      SELECT MIN(sp."minPrice") AS from_price
      FROM "ShopServicePrice" sp
      WHERE sp."mechanicId" = r.id ${priceScope}
    ) price ON true
    ORDER BY ${orderBy}
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
      country: true,
      zip: true,
      lat: true,
      lng: true,
      phone: true,
      website: true,
      hours: true,
      subscriptionStatus: true,
      listingStatus: true,
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

/**
 * Typeahead lookup by name or town. Matching runs in Postgres and only a
 * handful of rows come back, so the browser never holds the shop list.
 */
export const searchMechanicsByName = (query: string, limit: number) =>
  prisma.mechanic.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, city: true, state: true },
    orderBy: [{ name: "asc" }],
    take: limit,
  });
