import { describe, expect, it } from "vitest";
import {
  addressQuery, isKnownCountry, isKnownUsState, usesStates, countryName,
} from "../lib/geo/regions";

/*
  A state belongs to a US address and nowhere else here.

  The risk is not the dropdown, it is the geocoder query: a stray state line on
  a German address makes the place harder to find, and a missing one on a US
  address makes it ambiguous — most states have a Springfield.
*/

describe("which countries use states", () => {
  it("asks for one in the United States", () => {
    expect(usesStates("US")).toBe(true);
  });

  it.each(["GB", "DE", "FR", "JP"])("does not ask for one in %s", (c) => {
    expect(usesStates(c)).toBe(false);
  });
});

describe("validating what was chosen", () => {
  it("accepts a country from the list", () => {
    expect(isKnownCountry("DE")).toBe(true);
  });

  it("rejects one that is not", () => {
    // The route only checks the shape, so this is what stops "ZZ".
    expect(isKnownCountry("ZZ")).toBe(false);
  });

  it("accepts states, DC and territories", () => {
    for (const s of ["TX", "CA", "DC", "PR", "GU"]) expect(isKnownUsState(s)).toBe(true);
  });

  it("rejects a state that does not exist", () => {
    expect(isKnownUsState("XX")).toBe(false);
  });
});

describe("the query handed to the geocoder", () => {
  it("includes the state for a US address", () => {
    const q = addressQuery({
      address: "1100 Congress Ave", city: "Austin", state: "TX", zip: "78701", country: "US",
    });
    expect(q).toBe("1100 Congress Ave, Austin, TX, 78701, United States");
  });

  it("leaves the state out entirely elsewhere", () => {
    const q = addressQuery({
      address: "10 Downing St", city: "London", state: "", zip: "SW1A 2AA", country: "GB",
    });
    expect(q).toBe("10 Downing St, London, SW1A 2AA, United Kingdom");
  });

  it("drops a state that was left behind after switching country", () => {
    // The form clears it, but the query must not depend on the form.
    const q = addressQuery({
      address: "Unter den Linden 1", city: "Berlin", state: "TX", zip: null, country: "DE",
    });
    expect(q).not.toContain("TX");
    expect(q).toBe("Unter den Linden 1, Berlin, Germany");
  });

  it("names the country rather than passing a code", () => {
    expect(countryName("NL")).toBe("Netherlands");
    expect(addressQuery({ address: "A", city: "B", country: "NL" })).toContain("Netherlands");
  });
});
