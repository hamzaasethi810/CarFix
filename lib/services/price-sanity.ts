import "server-only";
import { pricingStats } from "../repositories/mechanic";

/*
  Catching a mistyped price at the moment it is entered.

  A single wrong figure — $4,000 for an oil change because a decimal slipped —
  distorts a median that other owners then rely on. Checking at submission is
  worth far more than moderating it afterwards, because afterwards nobody knows
  it was wrong.

  This never blocks. Sometimes a repair really does cost ten times the usual,
  and refusing it would silently bias the data toward the ordinary. It asks,
  and the person decides.
*/

/** Below this, "typical" is an opinion rather than a measurement. */
const MIN_SAMPLE = 5;

/** How far from the median counts as worth a second look. */
const LOW_FACTOR = 0.2;
const HIGH_FACTOR = 5;

export type PriceSanity = {
  /** True when the figure looks unusual enough to be worth confirming. */
  unusual: boolean;
  message: string | null;
  median: number | null;
  sampleSize: number;
};

export async function checkPrice(params: {
  serviceId: string;
  generationId?: string;
  totalPrice: number;
}): Promise<PriceSanity> {
  // Compare against the same job on the same kind of car where possible.
  const stats = await pricingStats({
    serviceId: params.serviceId,
    generationId: params.generationId,
  });

  const fallback = { unusual: false, message: null, median: stats.median, sampleSize: stats.count };

  if (stats.count < MIN_SAMPLE || stats.median === null || stats.median <= 0) return fallback;

  const ratio = params.totalPrice / stats.median;

  if (ratio >= HIGH_FACTOR) {
    return {
      unusual: true,
      median: stats.median,
      sampleSize: stats.count,
      message:
        `That is about ${Math.round(ratio)}× what other owners reported for this job ` +
        `(median ${formatUsd(stats.median)} across ${stats.count} reports). ` +
        `Worth checking the figure — but if it is right, go ahead.`,
    };
  }

  if (ratio <= LOW_FACTOR) {
    return {
      unusual: true,
      median: stats.median,
      sampleSize: stats.count,
      message:
        `That is well below what other owners reported for this job ` +
        `(median ${formatUsd(stats.median)} across ${stats.count} reports). ` +
        `Worth checking the figure — but if it is right, go ahead.`,
    };
  }

  return fallback;
}

const formatUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
