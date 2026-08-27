import { describe, expect, it } from "vitest";
import { normalisePlace, upsertWasCreate, type OverturePlace } from "../lib/services/overture-import";

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

  it("caps every unbounded text field, matching app/api/shops/submit/route.ts", () => {
    // The columns are Postgres text, so without a cap a malformed record
    // stores and renders a multi-KB field.
    const shop = normalisePlace(place({
      freeform: "A".repeat(1000),
      locality: "B".repeat(1000),
      region: "C".repeat(1000),
      postcode: "D".repeat(1000),
      phone: "E".repeat(1000),
      country: "USA",
    }));
    expect(shop?.address.length).toBe(200);
    expect(shop?.city.length).toBe(100);
    expect(shop?.state.length).toBe(100);
    expect(shop?.zip.length).toBe(20);
    expect(shop?.phone?.length).toBe(40);
    expect(shop?.country.length).toBe(2);
  });
});

describe("telling an insert from an update after an upsert", () => {
  it("calls it a create when the timestamps match", () => {
    const now = new Date("2026-08-26T12:00:00Z");
    expect(upsertWasCreate(now, now)).toBe(true);
  });

  it("calls it an update when updatedAt has moved on", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const updatedAt = new Date("2026-08-26T12:00:00Z");
    expect(upsertWasCreate(createdAt, updatedAt)).toBe(false);
  });
});
