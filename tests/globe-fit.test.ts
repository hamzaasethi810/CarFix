import { describe, expect, it } from "vitest";
import { fitZoom, LIMB_SAMPLES, limbRatio } from "../lib/map/globe-fit";

describe("limbRatio", () => {
  it("reproduces each measured sample exactly", () => {
    for (const { zoom, ratio } of LIMB_SAMPLES) {
      expect(limbRatio(zoom)).toBeCloseTo(ratio, 5);
    }
  });

  it("interpolates between samples", () => {
    const mid = limbRatio(1.55);
    expect(mid).toBeLessThan(1.0016);
    expect(mid).toBeGreaterThan(0.9993);
  });

  it("clamps outside the measured range rather than extrapolating", () => {
    // Extrapolating a fitted correction past its data is how a plausible
    // number becomes a wrong one silently. Clamp instead.
    expect(limbRatio(0.2)).toBeCloseTo(LIMB_SAMPLES[0].ratio, 5);
    expect(limbRatio(9)).toBeCloseTo(LIMB_SAMPLES.at(-1)!.ratio, 5);
  });
});

describe("fitZoom", () => {
  /*
    A stand-in for MapLibre that reproduces the measured curve: the projected
    diameter at each sampled zoom, linearly interpolated. Using the real
    numbers means a regression in the solver shows up as a wrong zoom for a
    real container size, not for an invented one.
  */
  const measured = [
    { zoom: 1.4, projected: 408.7 },
    { zoom: 1.7, projected: 491.7 },
    { zoom: 2.05, projected: 606.4 },
    { zoom: 2.3, projected: 701.3 },
    { zoom: 2.6, projected: 830.2 },
    { zoom: 2.9, projected: 975.8 },
    { zoom: 3.2, projected: 1138.0 },
  ];

  const projectedDiameterAt = (z: number): number => {
    if (z <= measured[0].zoom) return measured[0].projected;
    if (z >= measured.at(-1)!.zoom) return measured.at(-1)!.projected;
    for (let i = 1; i < measured.length; i++) {
      const a = measured[i - 1];
      const b = measured[i];
      if (z <= b.zoom) {
        const t = (z - a.zoom) / (b.zoom - a.zoom);
        return a.projected + t * (b.projected - a.projected);
      }
    }
    return measured.at(-1)!.projected;
  };

  /** What the sphere actually renders at, given the measured correction. */
  const renderedAt = (z: number) => projectedDiameterAt(z) / limbRatio(z);

  it("finds a zoom whose RENDERED diameter matches the target", () => {
    for (const target of [420, 540, 620, 760, 900, 1100]) {
      const z = fitZoom(projectedDiameterAt, target);
      expect(Math.abs(renderedAt(z) - target) / target).toBeLessThan(0.01);
    }
  });

  it("corrects for the limb, so it does not simply match project()", () => {
    /*
      The bug this guards: solving against project() alone leaves the sphere
      1-4% small, which is a visible ring at a 620px stage. If someone drops
      the correction, the projected diameter will equal the target instead of
      falling short of it, and this fails.
    */
    // Picked high in the range, where the correction is largest: near the
    // bottom it is a fraction of a percent and the assertion proves little.
    const z = fitZoom(projectedDiameterAt, 1100);
    expect(projectedDiameterAt(z)).toBeLessThan(1100);
    expect(renderedAt(z)).toBeCloseTo(1100, 0);
  });

  it("returns a larger zoom for a larger container", () => {
    expect(fitZoom(projectedDiameterAt, 900)).toBeGreaterThan(
      fitZoom(projectedDiameterAt, 450),
    );
  });

  it("stays inside the search bounds when the target is unreachable", () => {
    expect(fitZoom(projectedDiameterAt, 5, 0.5, 5)).toBeGreaterThanOrEqual(0.5);
    expect(fitZoom(projectedDiameterAt, 100000, 0.5, 5)).toBeLessThanOrEqual(5);
  });
});
