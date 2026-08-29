import { describe, expect, it } from "vitest";
import { withStrictSsl } from "../lib/db-url";

describe("withStrictSsl", () => {
  it("upgrades the modes pg is about to weaken", () => {
    for (const weak of ["require", "prefer", "verify-ca"]) {
      const out = withStrictSsl(`postgres://u:p@h/db?sslmode=${weak}`);
      expect(out, weak).toContain("sslmode=verify-full");
      expect(out, weak).not.toContain(`sslmode=${weak}`);
    }
  });

  it("leaves an already-strict URL alone", () => {
    const url = "postgres://u:p@h/db?sslmode=verify-full";
    expect(withStrictSsl(url)).toBe(url);
  });

  it("leaves a deliberate opt-out alone", () => {
    // sslmode=disable is somebody saying they know; not ours to override.
    const url = "postgres://u:p@h/db?sslmode=disable";
    expect(withStrictSsl(url)).toBe(url);
  });

  it("adds nothing when no sslmode was given", () => {
    // The driver's own default applies; inventing one here would change
    // behaviour for local sockets that never wanted TLS.
    const url = "postgres://u:p@h/db";
    expect(withStrictSsl(url)).toBe(url);
  });

  it("keeps every other parameter and the rest of the URL intact", () => {
    const out = withStrictSsl(
      "postgres://u:p@h.example.com:5432/db?sslmode=require&application_name=gaari&pool_timeout=15",
    );
    expect(out).toContain("application_name=gaari");
    expect(out).toContain("pool_timeout=15");
    expect(out).toContain("h.example.com:5432");
  });

  it("returns anything unparseable untouched rather than throwing", () => {
    // A bad URL should fail at connect time with the driver's own message,
    // not here with a URL parse error that hides it.
    expect(withStrictSsl("not a url")).toBe("not a url");
  });
});
