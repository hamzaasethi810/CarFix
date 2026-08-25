import { describe, expect, it } from "vitest";
import { mechanicSearchSchema } from "../lib/validation/schemas";

/*
  The map draws pins, so a low cap does not paginate — it hides shops.

  This was capped at 50. A search around a city centre matches several hundred,
  so the nearest fifty were drawn and the rest were absent with nothing on
  screen to say so. Somebody who added a shop and went looking for it found
  nothing unless it happened to be one of the fifty closest.
*/

describe("the map search limit", () => {
  it("allows enough pins for a whole city", () => {
    const parsed = mechanicSearchSchema.parse({ limit: "500" });
    expect(parsed.limit).toBe(500);
  });

  it("still refuses an unbounded request", () => {
    // Raising the ceiling must not remove it.
    expect(() => mechanicSearchSchema.parse({ limit: "5000" })).toThrow();
  });

  it("accepts what the map actually asks for", () => {
    // The number discover.tsx sends. If one moves, this fails rather than
    // silently clamping back to a truncated map.
    const requested = 500;
    expect(() => mechanicSearchSchema.parse({ limit: String(requested) })).not.toThrow();
  });
});
