import "server-only";
import { prisma } from "../db";
import type { OsmShop } from "../providers/overpass";

/** Coarse grid (~5.5km) so nearby searches share a coverage record. */
const CELL = 0.05;
const roundToCell = (v: number) => Math.round(v / CELL) * CELL;

const FRESH_FOR_DAYS = 30;

/**
 * True when this area was already pulled at an equal or wider radius recently,
 * meaning Overpass can be skipped entirely.
 */
export async function hasFreshCoverage(lat: number, lng: number, radiusMiles: number) {
  const cutoff = new Date(Date.now() - FRESH_FOR_DAYS * 86_400_000);
  const row = await prisma.geoCoverage.findUnique({
    where: { cellLat_cellLng: { cellLat: roundToCell(lat), cellLng: roundToCell(lng) } },
    select: { radiusMiles: true, fetchedAt: true },
  });
  return Boolean(row && row.radiusMiles >= radiusMiles && row.fetchedAt > cutoff);
}

export async function recordCoverage(
  lat: number,
  lng: number,
  radiusMiles: number,
  shopCount: number,
) {
  const cellLat = roundToCell(lat);
  const cellLng = roundToCell(lng);
  await prisma.geoCoverage.upsert({
    where: { cellLat_cellLng: { cellLat, cellLng } },
    create: { cellLat, cellLng, radiusMiles, shopCount },
    update: { radiusMiles, shopCount, fetchedAt: new Date() },
  });
}

/**
 * Writes shops in, keyed on their upstream OSM id so re-ingesting the same
 * area updates rows rather than duplicating them. Owner-reported experiences
 * hang off the mechanic id, which never changes.
 */
export async function upsertOsmShops(shops: OsmShop[]) {
  let created = 0;

  for (const shop of shops) {
    const existing = await prisma.mechanic.findUnique({
      where: { source_sourceRef: { source: "OSM", sourceRef: shop.sourceRef } },
      select: { id: true },
    });

    const data = {
      name: shop.name,
      address: shop.address,
      city: shop.city,
      state: shop.state,
      zip: shop.zip,
      lat: shop.lat,
      lng: shop.lng,
      phone: shop.phone,
      website: shop.website,
    };

    if (existing) {
      await prisma.mechanic.update({ where: { id: existing.id }, data });
    } else {
      await prisma.mechanic.create({
        data: { ...data, source: "OSM", sourceRef: shop.sourceRef },
      });
      created += 1;
    }
  }

  return { created, total: shops.length };
}
