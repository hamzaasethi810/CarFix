import { describe, expect, it } from "vitest";
import { normalisePlace, type OverturePlace } from "../lib/services/overture-import";

const place = (over: Partial<OverturePlace> = {}): OverturePlace => ({
  id: "08f2ab...",
  name: "Redline Auto Service",
  category: "automotive_repair",
  confidence: 0.91,
  lat: 38.8816,
  lng: -77.0910,
  freeform: "1145 Fern St",
  locality: "Arlington",
  region: "VA",
  postcode: "22202",
  country: "US",
  phone: "+1 703-555-0199",
  website: "https://redline.example",
  ...over,
});

describe("turning an Overture place into a shop", () => {
  it("keeps the fields the map needs", () => {
    const shop = normalisePlace(place());
    expect(shop).toMatchObject({
      name: "Redline Auto Service",
      address: "1145 Fern St",
      city: "Arlington",
      state: "VA",
      country: "US",
      zip: "22202",
      lat: 38.8816,
      lng: -77.091,
      sourceRef: "08f2ab...",
    });
  });

  it("attaches the services its category implies", () => {
    expect(normalisePlace(place())?.services).toContain("Diagnostic");
  });

  it("drops a place below the confidence floor", () => {
    // More likely wrong than right; importing it pollutes the map.
    expect(normalisePlace(place({ confidence: 0.3 }))).toBeNull();
  });

  it("drops a category that is not a workshop", () => {
    expect(normalisePlace(place({ category: "towing_service" }))).toBeNull();
  });

  it("drops a place with no name", () => {
    // An unnamed shop cannot be presented or reviewed.
    expect(normalisePlace(place({ name: "" }))).toBeNull();
  });

  it("drops a place with no coordinates", () => {
    expect(normalisePlace(place({ lat: null as unknown as number }))).toBeNull();
  });

  it("survives missing optional fields", () => {
    const shop = normalisePlace(place({
      freeform: null, locality: null, postcode: null, phone: null, website: null,
    }));
    expect(shop).toMatchObject({ address: "", city: "", zip: "", phone: null, website: null });
  });

  it("refuses a website that is not http", () => {
    // A javascript: URL must never reach an anchor tag.
    expect(normalisePlace(place({ website: "javascript:alert(1)" }))?.website).toBeNull();
  });

  it("keeps state empty outside the United States", () => {
    const shop = normalisePlace(place({ country: "GB", region: "England" }));
    expect(shop?.state).toBe("");
  });
});
