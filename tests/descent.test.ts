import { describe, expect, it } from "vitest";
import { CITY_ZOOM, descentPlan, STREET_ZOOM_FLOOR } from "../lib/map/descent";

describe("descentPlan", () => {
  const plan = descentPlan({ lat: 38.88, lng: -77.09, zoom: 12 });

  it("arrives at the zoom it was asked for", () => {
    expect(plan.at(-1)!.zoom).toBe(12);
  });

  it("stays above the street-tile floor until the final leg", () => {
    // This is the whole cost argument. Every intermediate keyframe that sits
    // below the floor is a band of tiles the browser will request on the way
    // down, and there are 200-400 of them across a naive flight.
    for (const step of plan.slice(0, -1)) {
      expect(step.zoom, `intermediate zoom ${step.zoom}`).toBeLessThan(STREET_ZOOM_FLOOR);
    }
  });

  it("descends monotonically, so the camera never doubles back", () => {
    const zooms = plan.map((s) => s.zoom);
    expect([...zooms].sort((a, b) => a - b)).toEqual(zooms);
  });

  it("keeps the flight short enough to sit through", () => {
    const total = plan.reduce((n, s) => n + s.durationMs, 0);
    expect(total).toBeLessThanOrEqual(4000);
  });

  it("arrives close enough to the street floor that the paid leg is short", () => {
    /*
      The whole cost argument rests on the final leg being a hop, not a climb.
      These two constants used to live in different files, linked only by a
      comment — so either could drift and quietly turn one cheap leg into a
      long streaming one. This is the assertion that stops that.
    */
    expect(CITY_ZOOM).toBeGreaterThan(STREET_ZOOM_FLOOR);
    expect(CITY_ZOOM - STREET_ZOOM_FLOOR).toBeLessThanOrEqual(3);
  });
});
