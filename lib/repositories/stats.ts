import "server-only";
import { prisma } from "../db";

/*
  Counts for the landing page's proof panel.

  Three COUNT queries rather than one aggregate: they are over unrelated
  tables, so there is nothing to join, and Postgres answers each from its own
  index. The caller caches the result.
*/
export const countReportedServices = () => prisma.mechanicExperience.count();
export const countShops = () => prisma.mechanic.count();
export const countGenerations = () => prisma.generation.count();

/*
  Per-vehicle service totals for one owner's garage.

  One grouped query rather than a count per vehicle: a garage with a dozen
  cars would otherwise issue a dozen round trips to render a summary strip.
*/
export async function garageTotals(ownerId: string) {
  const rows = await prisma.mechanicExperience.groupBy({
    by: ["vehicleId"],
    /*
      deletedAt: null is the fix, not decoration. Deleting a logged service
      soft-deletes it (sets deletedAt); without this filter the count and the
      total here still included the deleted rows, so a service you removed kept
      being counted in the garage. The vehicle is scoped to its owner and to
      not-deleted for the same reason.
    */
    where: { deletedAt: null, vehicle: { ownerId, deletedAt: null } },
    _count: { _all: true },
    _sum: { totalPrice: true },
  });
  return rows.map((r) => ({
    vehicleId: r.vehicleId,
    services: r._count._all,
    spent: r._sum.totalPrice ?? 0,
  }));
}

/** Distinct service types the record can file a price against. */
export const countServices = () => prisma.service.count();
