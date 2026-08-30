/*
  How big the globe renders, and what zoom makes it fill a given box.

  The globe's zoom used to be the constant 2.05, with a comment claiming the
  sphere "exactly fills .globe-stage's circle". That held at one window width.
  The stage is sized in vmin, so it scales with the viewport while a constant
  zoom does not: measured, a 2560x1440 window gave a 620px stage around a
  ~520px sphere — a 50px dead ring — while a 1440x780 window gave a 406px
  stage that cropped the sphere.

  Two models were tried and rejected against rendered pixels before this one:

    d = k * 2^zoom      k drifts 139.45 (z=1.4) -> 120.73 (z=2.6). Not a
                        constant, so no single fitted value is right.

    d = project() span  Close, but short by 1-4%, drifting with zoom. A
                        sphere's visible limb under perspective sits inside
                        the point 90 degrees of longitude away, and the gap
                        widens as the camera approaches. At a 620px stage 4%
                        is a ~12px ring: the very defect being fixed.

  So: solve numerically against project(), then divide out the measured
  shortfall below.
*/

/*
  Rendered diameter over projected diameter, measured in Chrome against
  MapLibre GL 6.6.0 with an 800px square container.

  If MapLibre changes how zoom maps to globe radius these stop being true.
  scripts/verify-globe-fit.mjs is what catches that: it renders the real page
  and asserts the sphere fills its stage, so a drift here fails loudly instead
  of quietly detaching the globe from its shadow again.
*/
export const LIMB_SAMPLES: ReadonlyArray<{ zoom: number; ratio: number }> = [
  { zoom: 1.4, ratio: 0.991 },
  { zoom: 1.7, ratio: 0.986 },
  { zoom: 2.05, ratio: 0.975 },
  { zoom: 2.3, ratio: 0.967 },
  { zoom: 2.6, ratio: 0.956 },
];

/**
 * The correction at a given zoom, linearly interpolated between samples.
 *
 * Clamped outside the measured range rather than extrapolated: past the data
 * an extrapolated ratio is a plausible-looking number with nothing behind it,
 * and the failure it would cause (a slightly wrong globe size) is exactly the
 * kind that survives review.
 */
export function limbRatio(zoom: number): number {
  const first = LIMB_SAMPLES[0];
  const last = LIMB_SAMPLES[LIMB_SAMPLES.length - 1];
  if (zoom <= first.zoom) return first.ratio;
  if (zoom >= last.zoom) return last.ratio;

  for (let i = 1; i < LIMB_SAMPLES.length; i++) {
    const a = LIMB_SAMPLES[i - 1];
    const b = LIMB_SAMPLES[i];
    if (zoom <= b.zoom) {
      const t = (zoom - a.zoom) / (b.zoom - a.zoom);
      return a.ratio + t * (b.ratio - a.ratio);
    }
  }
  return last.ratio;
}

/**
 * The zoom at which the sphere renders `targetDiameter` CSS pixels across.
 *
 * Bisection rather than an inverted formula because there is no formula worth
 * trusting here — see the header. `projectedDiameterAt` is expected to be
 * monotonically increasing in zoom, which MapLibre's is over any range this
 * is called with.
 *
 * @param projectedDiameterAt Measures the projected span at a zoom. Calling
 *   this mutates the map's zoom in the real implementation, so the caller is
 *   responsible for restoring or committing the final value.
 */
export function fitZoom(
  projectedDiameterAt: (zoom: number) => number,
  targetDiameter: number,
  lo = 0.5,
  hi = 5,
  iterations = 18,
): number {
  let low = lo;
  let high = hi;
  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2;
    const rendered = projectedDiameterAt(mid) / limbRatio(mid);
    if (rendered < targetDiameter) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}
