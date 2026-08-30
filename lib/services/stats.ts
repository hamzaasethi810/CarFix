import "server-only";
import {
  countGenerations,
  countReportedServices,
  countShops,
} from "../repositories/stats";

export type ProofNumbers = {
  experiences: number;
  shops: number;
  generations: number;
};

/**
 * The landing page's proof numbers, or null if they cannot be read.
 *
 * Null rather than throwing, and the page omits the panel when it gets one.
 * A marketing stat is not worth returning a 500 for: a landing page that
 * fails to render because a count query timed out is strictly worse than one
 * that renders without the count.
 */
export async function getProofNumbers(): Promise<ProofNumbers | null> {
  try {
    const [experiences, shops, generations] = await Promise.all([
      countReportedServices(),
      countShops(),
      countGenerations(),
    ]);
    return { experiences, shops, generations };
  } catch {
    return null;
  }
}
