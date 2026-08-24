import "server-only";
import { AppError, validation } from "../errors";

/*
  NHTSA vPIC — the US government's vehicle database.

  Free, no API key, no account, no rate-limit tier to manage. It is the reason
  VIN decoding costs nothing to run.

  Called only from the server: the browser never talks to it directly, so the
  endpoint stays behind our own rate limiting and validation.
*/

const BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";
const TIMEOUT_MS = 6000;

export type DecodedVin = {
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  trim: string | null;
  engine: string | null;
  drivetrain: string | null;
  bodyClass: string | null;
  /** vPIC error codes: "0" means a clean decode. */
  errorText: string | null;
};

type VpicRow = Record<string, string>;

const clean = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t === "" || t.toLowerCase() === "not applicable" ? null : t;
};

/** vPIC reports drive type in prose; map it onto our normalised values. */
function normalizeDrivetrain(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("all")) return "AWD";
  if (v.includes("4wd") || v.includes("4x4") || v.includes("four")) return "4WD";
  if (v.includes("front")) return "FWD";
  if (v.includes("rear")) return "RWD";
  return null;
}

/** Build a readable engine label out of the separate fields vPIC returns. */
function buildEngine(row: VpicRow): string | null {
  const liters = clean(row.DisplacementL);
  const cylinders = clean(row.EngineCylinders);
  const config = clean(row.EngineConfiguration);
  const turbo = clean(row.Turbo);

  const size = liters ? `${Number(liters).toFixed(1)}L` : null;
  const layout =
    config && cylinders
      ? `${config.toLowerCase().startsWith("v") ? "V" : config.toLowerCase().startsWith("in") ? "I" : "H"}${cylinders}`
      : cylinders
        ? `${cylinders}-cyl`
        : null;

  const parts = [size, layout, turbo?.toLowerCase() === "yes" ? "Turbo" : null].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export async function decodeVin(vin: string): Promise<DecodedVin> {
  const url = `${BASE}/DecodeVinValues/${encodeURIComponent(vin)}?format=json`;

  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json" },
      // Decoded VINs are stable, so let the platform cache them for a day.
      next: { revalidate: 86_400 },
    });
  } catch {
    throw new AppError("INTERNAL", "The VIN lookup service is unavailable right now.");
  }

  if (!response.ok) {
    throw new AppError("INTERNAL", "The VIN lookup service is unavailable right now.");
  }

  const body = (await response.json()) as { Results?: VpicRow[] };
  const row = body.Results?.[0];
  if (!row) throw validation("That VIN could not be decoded.");

  const year = clean(row.ModelYear);

  return {
    vin,
    make: clean(row.Make),
    model: clean(row.Model),
    year: year ? Number(year) : null,
    trim: clean(row.Trim) ?? clean(row.Series),
    engine: buildEngine(row),
    drivetrain: normalizeDrivetrain(clean(row.DriveType)),
    bodyClass: clean(row.BodyClass),
    errorText: clean(row.ErrorText),
  };
}
