import { describe, expect, it } from "vitest";
import { formatDate } from "../components/ui";

/*
  Dates have to render identically wherever they are rendered.

  Two failures, one cause. `toLocaleDateString()` with no arguments takes the
  runtime's locale and zone, so Node and a visitor's browser disagree and React
  reports that the server HTML did not match — it does not patch that up. And
  because service dates are stored at midnight, formatting one in a zone west
  of Greenwich moves it to the previous day, which at the first of a month also
  changes the month shown.
*/

describe("formatDate", () => {
  it("does not depend on the machine's time zone", () => {
    const original = process.env.TZ;
    const seen = new Set<string>();
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo", "Pacific/Kiritimati"]) {
      process.env.TZ = tz;
      seen.add(formatDate("2026-06-01T00:00:00.000Z"));
    }
    process.env.TZ = original;
    expect(seen.size).toBe(1);
  });

  it("keeps a midnight date on its own day", () => {
    // Stored 1 June; must not read as 31 May anywhere.
    expect(formatDate("2026-06-01T00:00:00.000Z")).toBe("Jun 1, 2026");
  });

  it("accepts a Date as well as a string", () => {
    expect(formatDate(new Date("2026-08-24T00:00:00.000Z"))).toBe("Aug 24, 2026");
  });

  it("shows a dash rather than 'Invalid Date'", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });
});
